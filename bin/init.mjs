#!/usr/bin/env node
// `npx @postotter/video init` — turn five setup steps into one.
//
// Installing a library and reading a skill leaves somebody with a Remotion
// project to stand up, a stylesheet to compile and a composition to wire before
// anything renders. That is the gap between "installed it" and "made a video",
// and it is where most people stop.
//
// So this does the parts that are mechanical:
//
//   - finds their Tailwind config and CSS entry and COMPILES their stylesheet,
//     because a surface written in their class names needs it
//   - writes a Remotion entry, a root, and a film that already runs
//   - writes one surface stub carrying the contract, so the agent has a shape
//     to copy rather than a spec to interpret
//
// It does not touch anything that already exists, it installs nothing without
// being asked, and it prints the one command left to run.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const OUT = "postotter";
const cwd = process.cwd();
const say = (s = "") => console.log(s);
const rel = (p) => path.relative(cwd, p).split(path.sep).join("/");

/* ── find what they have ─────────────────────────────────────────── */

function findUp(names, from = cwd, stop = 4) {
  let dir = from;
  for (let i = 0; i <= stop; i++) {
    for (const n of names) {
      const p = path.join(dir, n);
      if (fs.existsSync(p)) return p;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/** The stylesheet with the @tailwind directives in it — their real entry, not
 *  a file we guess the name of.
 *
 *  A monorepo usually has several. Picking the first one found lands on the
 *  marketing site as often as the app, so candidates are ranked: a path with
 *  "app" in it beats one with "marketing" or "site" or "docs", and a longer
 *  file beats a shorter one, because the real entry carries the design tokens. */
function findCssEntries() {
  const found = [];
  const roots = ["src", "app", "apps", "packages", "styles", "."].map((d) => path.join(cwd, d));
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!/node_modules|\.git|dist|build|\.next/.test(e.name)) stack.push(full);
        } else if (e.name.endsWith(".css")) {
          let text = "";
          try {
            text = fs.readFileSync(full, "utf8");
          } catch {
            continue;
          }
          if (/@tailwind\s+(base|utilities)|@import\s+["']tailwindcss/.test(text)) {
            found.push({ file: full, size: text.length });
          }
        }
      }
    }
  }
  const score = (f) => {
    const p = f.file.toLowerCase();
    let n = f.size;
    if (/[\/](web-)?app[\/]/.test(p)) n += 50_000;
    if (/marketing|landing|website|site|docs|storybook/.test(p)) n -= 50_000;
    return n;
  };
  return found.sort((a, b) => score(b) - score(a)).map((f) => f.file);
}

/** The source tree a stylesheet's utilities should be scanned from — the
 *  package the entry lives in, not wherever the config happens to sit. */
function sourceRootFor(cssEntry) {
  let dir = path.dirname(cssEntry);
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, "package.json")) || path.basename(dir) === "src") {
      return dir;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return path.dirname(cssEntry);
}

/** Their Tailwind binary.
 *
 *  Order matters on Windows: node_modules/.bin holds BOTH an extensionless
 *  shell script and a .cmd shim, and Node cannot spawn the former — it is bash.
 *  Trying it first fails with ENOENT on every Windows machine, which is a
 *  quarter of the people who will run this. */
function tailwindBin() {
  const names = process.platform === "win32"
    ? ["tailwindcss.cmd", "tailwindcss.CMD", "tailwindcss.ps1", "tailwindcss"]
    : ["tailwindcss"];
  for (const n of names) {
    const p = findUp([path.join("node_modules", ".bin", n)]);
    if (p) return p;
  }
  return null;
}

/* ── compile their stylesheet ────────────────────────────────────── */

function compileCss(configPath, cssEntry, outDir) {
  const bin = tailwindBin();
  if (!bin) return { ok: false, why: "no tailwindcss binary in node_modules/.bin" };

  // Their config's content globs are relative to the config, which in a
  // monorepo points at a root where "./src" and "./components" do not exist —
  // so it compiles the tokens, matches no utilities, and produces a stylesheet
  // that looks fine and styles nothing. Scan the tree the entry actually lives
  // in instead.
  const srcRoot = sourceRootFor(cssEntry).split(path.sep).join("/");
  const shim = path.join(outDir, ".tw.config.cjs");
  fs.writeFileSync(
    shim,
    `const base = require(${JSON.stringify(configPath.split(path.sep).join("/"))});
` +
      `const cfg = base.default || base;
` +
      `module.exports = { ...cfg, content: [${JSON.stringify(srcRoot + "/**/*.{ts,tsx,js,jsx,html,mdx}")}] };
`
  );

  // Their entry may @import things a standalone build cannot resolve (fonts,
  // map SDKs). Those are the app's concern, not the video's.
  const src = fs.readFileSync(cssEntry, "utf8").replace(/^@import\s+['"][^'"]+['"];?\s*$/gm, "");
  const tmpIn = path.join(outDir, ".brand-in.css");
  const tmpOut = path.join(outDir, ".brand-out.css");
  fs.writeFileSync(tmpIn, src);

  try {
    execFileSync(bin, ["-c", shim, "-i", tmpIn, "-o", tmpOut, "--minify"], {
      stdio: "pipe",
      cwd: path.dirname(configPath),
      // A .cmd shim is not an executable Node can spawn directly on Windows.
      shell: process.platform === "win32",
    });
  } catch (e) {
    fs.rmSync(tmpIn, { force: true });
    return { ok: false, why: (e.stderr?.toString() || e.message).split("\n")[0] };
  }

  const css = fs.readFileSync(tmpOut, "utf8");
  fs.rmSync(tmpIn, { force: true });
  fs.rmSync(tmpOut, { force: true });

  const esc = css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return { ok: true, bytes: css.length, module: `// Your compiled stylesheet, verbatim.
//
// Built from your own Tailwind config against your own source, so a surface can
// be written in YOUR class names — copied out of your components — rather than
// in somebody's translation of your tokens.
//
// Regenerate with \`npx @postotter/video init\` after a redesign. Never hand-edit.
/* eslint-disable */
export const brandCss = \`${esc}\`;
` };
}

/* ── templates ───────────────────────────────────────────────────── */

const surfaceStub = `import React from "react";
import { defineSurface, type SurfaceProps } from "@postotter/video";
// Import YOUR components. They already know what your product looks like.
// import { Card, CardContent } from "@/components/ui/card";

interface Data {
  title: string;
}

/**
 * A SURFACE is one screen of your product, rebuilt for film.
 *
 * The one rule: it is a pure function of (state, data). No useCurrentFrame, no
 * interpolate, no spring, no frame numbers. It knows how to look right in each
 * of its states; the grammar decides when they happen.
 *
 * Author it at 393x852 — a real phone — so your own type scale and padding are
 * the size they are on a handset.
 */
const Body: React.FC<SurfaceProps<Data>> = ({ state, data }) => (
  <div className="absolute inset-0 bg-background flex flex-col p-5">
    <h1 className="text-xl font-semibold text-foreground">{data.title}</h1>
    {state === "done" ? (
      <p className="mt-2 text-sm text-primary">Something changed.</p>
    ) : (
      <p className="mt-2 text-sm text-muted-foreground">Nothing has happened yet.</p>
    )}
  </div>
);

export const example = defineSurface<Data>({
  id: "example",
  // One plain sentence. The copy model reads this to decide what the post says.
  describes: "replace me with what this screen is actually for",
  // The first state is the resting state: what frame 0 draws, and what both
  // platforms use as the grid thumbnail.
  states: ["idle", "done"],
  // Where a finger can land, in the 393x852 viewport. Measure these off a
  // render — guessing puts the tap on empty space.
  targets: { thing: { x: 196, y: 400 } },
  // How YOUR app moves between states, read off your CSS or Tailwind config.
  // motion: { ms: 350, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  component: Body,
});
`;

const filmTsx = (hasCss) => `import React from "react";
import { Film, type Take } from "@postotter/video";
import { example } from "./surfaces/example";
${hasCss ? 'import { brandCss } from "./brand-css";\n' : ""}
// One take per shot. The beats are the edit: hold, tap, type, swipe.
export const TAKES: Take<any>[] = [
  {
    surface: example,
    data: { title: "Your screen" },
    caption: "Say what is on screen, not what the product is",
    beats: [
      { kind: "hold", words: 5 },
      { kind: "tap", target: "thing", then: "done" },
      { kind: "hold", words: 5 },
    ],
  },
];

export const MyFilm: React.FC = () => (
  <Film
    takes={TAKES}
    ground="#EEF3F8"
    accent="#111111"${hasCss ? "\n    css={brandCss}" : ""}
    // Your webfont, from your own index.html. Held until loaded, because a font
    // still in flight renders as the fallback.
    // fontUrl="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
  />
);
`;

const rootTsx = `import React from "react";
import { Composition } from "remotion";
import { planFilm } from "@postotter/video";
import { MyFilm, TAKES } from "./film";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MyFilm"
    component={MyFilm}
    fps={30}
    width={1080}
    height={1920}
    // Length comes from the beats, so the video is as long as it needs to be
    // and never longer.
    durationInFrames={planFilm(TAKES).total}
  />
);
`;

const indexTs = `import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
`;

/* ── run ─────────────────────────────────────────────────────────── */

function write(file, contents, written, skipped) {
  if (fs.existsSync(file)) {
    skipped.push(rel(file));
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  written.push(rel(file));
}

function main() {
  const outDir = path.join(cwd, OUT);
  fs.mkdirSync(path.join(outDir, "surfaces"), { recursive: true });

  const written = [];
  const skipped = [];

  // 1. their stylesheet
  const config = findUp(["tailwind.config.ts", "tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs"]);
  const candidates = config ? findCssEntries() : [];
  const cssEntry = candidates[0] ?? null;
  let cssNote = "";
  let hasCss = false;

  if (config && cssEntry) {
    const r = compileCss(config, cssEntry, outDir);
    if (r.ok) {
      write(path.join(outDir, "brand-css.ts"), r.module, written, skipped);
      hasCss = true;
      cssNote =
        `compiled ${(r.bytes / 1024).toFixed(0)}KB from ${rel(cssEntry)}` +
        (candidates.length > 1 ? `  (${candidates.length - 1} other stylesheet(s) found — check this is the app's)` : "");
    } else {
      cssNote = `could not compile your CSS (${r.why}) — surfaces will need inline styles`;
    }
  } else {
    cssNote = config
      ? "found a Tailwind config but no stylesheet with @tailwind in it"
      : "no Tailwind config found — if you use another system, load its CSS yourself";
  }

  // 2. a project that already runs
  write(path.join(outDir, "surfaces", "example.tsx"), surfaceStub, written, skipped);
  write(path.join(outDir, "film.tsx"), filmTsx(hasCss), written, skipped);
  write(path.join(outDir, "Root.tsx"), rootTsx, written, skipped);
  write(path.join(outDir, "index.ts"), indexTs, written, skipped);

  const needs = ["remotion", "@remotion/cli"].filter((d) => {
    try {
      return !findUp([path.join("node_modules", d, "package.json")]);
    } catch {
      return true;
    }
  });

  say();
  say("  postotter/video");
  say();
  for (const f of written) say(`    wrote    ${f}`);
  for (const f of skipped) say(`    kept     ${f} (already there)`);
  say(`    css      ${cssNote}`);
  say();

  if (needs.length) {
    say(`  Install Remotion, then open the studio:`);
    say();
    say(`    npm i -D ${needs.join(" ")}`);
  } else {
    say("  Open the studio:");
    say();
  }
  say(`    npx remotion studio ${OUT}/index.ts`);
  say();
  say("  Then ask your agent:");
  say();
  say("    Read SKILL.md and write a surface for <one of your screens>.");
  say();
}

main();
