// The palette reader, against the two vocabularies that actually turn up.
//
//   node --test packages/postotter-video/bin/init.test.mjs
//
// This exists because the first version of the stub was written in shadcn's
// token names and rendered as invisible grey text on a project that used its
// own. The failure was silent — valid TSX, valid classes, nothing on screen —
// so it needs a test rather than a careful reader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPalette, separate, surfaceStub, filmTsx } from "./init.mjs";

const shadcn = `
:root { --background: 0 0% 100%; --foreground: 240 10% 4%; --primary: 240 6% 10%; }
.bg-background{background-color:hsl(var(--background))}
.text-foreground{color:hsl(var(--foreground))}
.text-muted-foreground{color:hsl(var(--muted-foreground))}
.text-primary{color:hsl(var(--primary))}
`;

const v4 = `
:root, :host { --color-bg: #121215; --color-text: #f0ede8; --color-accent: #ff6b00; }
.bg-bg{background-color:var(--color-bg)}
.text-text{color:var(--color-text)}
.text-text-muted{color:var(--color-text-muted)}
.text-accent{color:var(--color-accent)}
`;

test("reads shadcn's names", () => {
  const p = readPalette(shadcn);
  assert.equal(p.bg, "bg-background");
  assert.equal(p.fg, "text-foreground");
  assert.equal(p.accent, "text-primary");
});

test("reads a project that named its own tokens", () => {
  const p = readPalette(v4);
  assert.equal(p.bg, "bg-bg");
  assert.equal(p.fg, "text-text");
  assert.equal(p.accent, "text-accent");
  assert.equal(p.screen, "#121215");
  assert.equal(p.ink, "#ff6b00");
});

test("never emits a class the stylesheet does not have", () => {
  // The whole point: no shadcn vocabulary leaking into a project without it.
  const tsx = surfaceStub(readPalette(v4));
  for (const absent of ["bg-background", "text-foreground", "text-muted-foreground", "text-primary"]) {
    assert.ok(!tsx.includes(absent), `stub used ${absent}, which this project has no class for`);
  }
  assert.ok(tsx.includes("bg-bg"));
});

test("falls back to a colour when no utility survived compilation", () => {
  // Tailwind 4 only emits utilities it finds in source, so a defined token with
  // no usage means a real colour and no class.
  const p = readPalette(`:root { --color-bg: #101010; --color-accent: #00aa55; }`);
  assert.equal(p.bg, null);
  assert.equal(p.screen, "#101010");
  const tsx = surfaceStub(p);
  assert.ok(tsx.includes('style={{ background: "#101010" }}'), tsx.slice(0, 900));
});

test("the backdrop is held away from the screen", () => {
  // A near-black phone on a near-black field is only a bezel stroke apart.
  const p = readPalette(v4);
  assert.notEqual(p.ground, p.screen);
  assert.ok(filmTsx(true, p).includes(`ground="${p.ground}"`));
  // Dark lifts, light sinks; anything unparseable is left alone.
  assert.equal(separate("#000000"), "#0e0e0e");
  assert.equal(separate("#ffffff"), "#f1f1f1");
  assert.equal(separate("oklch(0.2 0 0)"), "oklch(0.2 0 0)");
});

test("an empty stylesheet still produces something that renders", () => {
  const tsx = surfaceStub(readPalette(""));
  assert.ok(tsx.includes("style={{"));
  assert.ok(!tsx.includes("undefined"));
  assert.ok(!filmTsx(false, readPalette("")).includes("undefined"));
});
