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

/** Tailwind 4 moved the config INTO the CSS: `@import "tailwindcss"` and an
 *  `@theme` block, with no JS config file anywhere and content auto-detected.
 *  A detector that looks for tailwind.config.* therefore sees nothing at all in
 *  a current project — which is most new ones, and nearly all vibecoded ones. */
function isV4(cssText) {
  return /@import\s+["']tailwindcss["']/.test(cssText);
}

/** Their Tailwind binary.
 *
 *  Order matters on Windows: node_modules/.bin holds BOTH an extensionless
 *  shell script and a .cmd shim, and Node cannot spawn the former — it is bash.
 *  Trying it first fails with ENOENT on every Windows machine, which is a
 *  quarter of the people who will run this. */
function tailwindBin(v4) {
  const stem = v4 ? "tailwindcss" : "tailwindcss";
  const names = process.platform === "win32"
    ? [`${stem}.cmd`, `${stem}.CMD`, `${stem}.ps1`, stem]
    : [stem];
  for (const n of names) {
    const p = findUp([path.join("node_modules", ".bin", n)]);
    if (p) return { cmd: p, args: [] };
  }
  // v4 ships its CLI as a separate package that a PostCSS-only setup will not
  // have installed. Fetching it on demand beats telling somebody to go and add
  // a dependency to their app so that a video tool can read their colours.
  if (v4) {
    return {
      cmd: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["--yes", "@tailwindcss/cli@4"],
    };
  }
  return null;
}

/* ── compile their stylesheet ────────────────────────────────────── */

function compileCss(configPath, cssEntry, outDir) {
  const entryText = fs.readFileSync(cssEntry, "utf8");
  const v4 = isV4(entryText);
  const bin = tailwindBin(v4);
  if (!bin) return { ok: false, why: "no tailwindcss binary in node_modules/.bin" };

  // Their config's content globs are relative to the config, which in a
  // monorepo points at a root where "./src" and "./components" do not exist —
  // so it compiles the tokens, matches no utilities, and produces a stylesheet
  // that looks fine and styles nothing. Scan the tree the entry actually lives
  // in instead.
  const srcRoot = sourceRootFor(cssEntry).split(path.sep).join("/");
  let shim = null;
  let extra = "";

  if (v4) {
    // v4 auto-detects sources relative to the CSS file, and this one is being
    // compiled from a temp location — so point it at the real tree explicitly.
    extra = `
@source ${JSON.stringify(srcRoot + "/**/*.{ts,tsx,js,jsx,html,mdx}")};
`;
  } else {
    shim = path.join(outDir, ".tw.config.cjs");
    fs.writeFileSync(
      shim,
      `const base = require(${JSON.stringify(configPath.split(path.sep).join("/"))});
` +
        `const cfg = base.default || base;
` +
        `module.exports = { ...cfg, content: [${JSON.stringify(srcRoot + "/**/*.{ts,tsx,js,jsx,html,mdx}")}] };
`
    );
  }

  // Their entry may @import things a standalone build cannot resolve (fonts,
  // map SDKs). Those are the app's concern, not the video's.
  // Drop imports a standalone build cannot resolve (fonts, map SDKs) — but
  // never the one that IS Tailwind.
  const src = entryText.replace(/^@import\s+['"]([^'"]+)['"];?\s*$/gm, (m, spec) =>
    spec === "tailwindcss" ? m : ""
  );
  const tmpIn = path.join(outDir, ".brand-in.css");
  const tmpOut = path.join(outDir, ".brand-out.css");
  fs.writeFileSync(tmpIn, src + extra);

  try {
    execFileSync(
      bin.cmd,
      [...bin.args, ...(shim ? ["-c", shim] : []), "-i", tmpIn, "-o", tmpOut, "--minify"],
      {
      stdio: "pipe",
      cwd: cwd,
      // A .cmd shim is not an executable Node can spawn directly on Windows.
      shell: process.platform === "win32",
      }
    );
  } catch (e) {
    fs.rmSync(tmpIn, { force: true });
    return { ok: false, why: (e.stderr?.toString() || e.message).split("\n")[0] };
  }

  const css = fs.readFileSync(tmpOut, "utf8");
  fs.rmSync(tmpIn, { force: true });
  fs.rmSync(tmpOut, { force: true });

  const esc = css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return { ok: true, bytes: css.length, v4, css, module: `// Your compiled stylesheet, verbatim.
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

/* ── reading their palette ───────────────────────────────────────── */

// The stub used to be written in shadcn's vocabulary — bg-background,
// text-foreground, text-muted-foreground — because that is what the first repo
// it was built against happened to use. A project that names its tokens
// `--color-bg` and `--color-text` gets `bg-bg` and `text-text` instead, so every
// one of those classes silently resolves to nothing: pale grey on a white phone,
// in an app that is actually near-black. It reads as "the stylesheet failed",
// which is the worst possible first thirty seconds.
//
// So the names come out of THEIR compiled CSS, and anything not found there
// falls back to a literal colour rather than to a class that does not exist.

const hasClass = (css, name) =>
  !!name && (css.includes(`.${name}{`) || css.includes(`.${name} {`));

/** The block a utility compiles to, so a colour can be read back out of it. */
function declOf(css, name, prop) {
  if (!name) return null;
  const at = [`.${name}{`, `.${name} {`]
    .map((k) => css.indexOf(k))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (at === undefined) return null;
  const body = css.slice(at, css.indexOf("}", at));
  const m = body.match(new RegExp(prop + "\s*:\s*([^;}]+)"));
  return m ? m[1].trim() : null;
}

/** One level of var() indirection — enough for `@theme` and for the `:root` HSL
 *  triplets shadcn writes, which between them cover every arrangement seen. */
function resolve(css, value) {
  if (!value) return null;
  const v = value.match(/var\(\s*(--[\w-]+)/);
  if (!v) return /^(#|rgb|hsl|oklch)/.test(value) ? value : null;
  const d = css.match(new RegExp("\\" + v[1] + "\s*:\s*([^;}]+)"));
  if (!d) return null;
  const raw = d[1].trim();
  // shadcn stores bare triplets: `--background: 0 0% 100%`.
  if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(raw)) return `hsl(${raw})`;
  return /^(#|rgb|hsl|oklch)/.test(raw) ? raw : null;
}

/** A token's value straight out of `:root` / `@theme`.
 *
 *  Needed because Tailwind 4 only emits the utilities it actually finds in the
 *  source. A project can define `--color-bg` and never write `bg-bg` anywhere,
 *  in which case the class is genuinely unavailable but the colour is not — and
 *  the colour is what the backdrop behind the phone needs. */
function varColor(css, names) {
  for (const n of names) {
    const v = resolve(css, `var(${n})`);
    if (v) return v;
  }
  return null;
}

/** The backdrop, held a little away from the screen colour.
 *
 *  Taking the app's background verbatim looked right in the source and wrong in
 *  the render: a near-black phone on a near-black field, separated only by the
 *  bezel stroke. The phone has to read as an object sitting on something. So a
 *  dark app gets lifted off its backdrop and a light one gets sunk into it —
 *  same hue, same family, just far enough apart to see an edge. */
function separate(color) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color ?? "").trim());
  if (!m) return color; // oklch(), rgb(), a gradient — leave it alone
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(hex, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const d = lum < 0.5 ? 14 : -14;
  return (
    "#" +
    rgb.map((v) => Math.max(0, Math.min(255, v + d)).toString(16).padStart(2, "0")).join("")
  );
}

const EMPTY = { bg: null, fg: null, muted: null, accent: null, screen: null, ground: null, ink: null };

function readPalette(css) {
  const pick = (opts) => opts.find((c) => hasClass(css, c)) ?? null;
  const bg = pick(["bg-background", "bg-bg", "bg-surface", "bg-card", "bg-base"]);
  const accent = pick(["text-primary", "text-accent", "text-brand"]);
  const fg = pick(["text-foreground", "text-text", "text-ink", "text-body"]);
  const screen = resolve(css, declOf(css, bg, "background-color")) ??
    varColor(css, ["--color-bg", "--color-background", "--background", "--color-surface"]);
  return {
    // The app background itself, for a surface that has to fall back to an
    // inline colour because no background utility survived compilation.
    screen,
    bg,
    fg,
    accent,
    muted: pick(["text-muted-foreground", "text-text-muted", "text-muted", "text-subtle"]),
    // What sits BEHIND the phone.
    ground: separate(screen),
    ink:
      resolve(css, declOf(css, accent ?? fg, "color")) ??
      varColor(css, ["--color-accent", "--color-primary", "--primary", "--color-text", "--foreground"]),
  };
}

/* ── templates ───────────────────────────────────────────────────── */

/** Layout utilities always exist; colour utilities only exist if the project
 *  named its tokens that way. So layout goes in the class list unconditionally
 *  and colour joins it only when their CSS really has it. */
const paint = (layout, token, fallback) =>
  token
    ? `className="${layout} ${token}"`
    : `className="${layout}" style={{ ${fallback} }}`;

const surfaceStub = (c) => `import React from "react";
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
 *
 * The classes below were read out of your compiled stylesheet, so they resolve.
 * Throw this component away and paste in a real screen: keep its markup, keep
 * its class names, import its components. It looks like your app because it is.
 */
const Body: React.FC<SurfaceProps<Data>> = ({ state, data }) => (
  <div ${paint("absolute inset-0 flex flex-col p-5", c.bg, `background: "${c.screen ?? "#ffffff"}"`)}>
    <h1 ${paint("text-xl font-semibold", c.fg, `color: "${c.ink ?? "#111111"}"`)}>{data.title}</h1>
    {state === "done" ? (
      <p ${paint("mt-2 text-sm", c.accent, `color: "${c.ink ?? "#111111"}"`)}>Something changed.</p>
    ) : (
      <p ${paint("mt-2 text-sm opacity-60", c.muted, `color: "${c.ink ?? "#111111"}", opacity: 0.6`)}>
        Nothing has happened yet.
      </p>
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

const filmTsx = (hasCss, c) => `import React from "react";
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
    // Taken from your own background token, so the frame around the phone
    // belongs to the same product as the phone.
    ground="${c.ground ?? "#EEF3F8"}"
    accent="${c.ink ?? "#111111"}"${hasCss ? "\n    css={brandCss}" : ""}
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
  // Look for the stylesheet FIRST. Tailwind 4 has no config file, so gating the
  // search on finding one makes every current project look like it has no
  // Tailwind at all.
  const candidates = findCssEntries();
  const cssEntry = candidates[0] ?? null;
  const config = findUp(["tailwind.config.ts", "tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs"]);
  let cssNote = "";
  let hasCss = false;
  let palette = EMPTY;

  if (cssEntry) {
    const r = compileCss(config, cssEntry, outDir);
    if (r.ok) {
      write(path.join(outDir, "brand-css.ts"), r.module, written, skipped);
      hasCss = true;
      palette = readPalette(r.css);
      cssNote =
        `compiled ${(r.bytes / 1024).toFixed(0)}KB from ${rel(cssEntry)} (Tailwind ${r.v4 ? "4" : "3"})` +
        (candidates.length > 1 ? `  (${candidates.length - 1} other stylesheet(s) found — check this is the app's)` : "");
    } else {
      cssNote = `could not compile your CSS (${r.why}) — surfaces will need inline styles`;
    }
  } else {
    cssNote =
      "no stylesheet with @tailwind or @import \"tailwindcss\" found — if you use another system, load its CSS yourself";
  }

  // 2. a project that already runs
  write(path.join(outDir, "surfaces", "example.tsx"), surfaceStub(palette), written, skipped);
  write(path.join(outDir, "film.tsx"), filmTsx(hasCss, palette), written, skipped);
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

// Run when invoked, stay quiet when imported — the palette reader above is
// worth testing, and a test that had to shell out to the whole installer would
// not be run.
if (process.argv[1] && path.resolve(process.argv[1]).endsWith("init.mjs")) main();

export { readPalette, separate, surfaceStub, filmTsx };
