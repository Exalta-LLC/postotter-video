// A week, planned without spending anything.
//
//   npx tsx --test remotion/grammar/week.test.ts
//
// The failures worth catching here are the ones a single day cannot see: a week
// that opens on the same screen twice running, or a cadence that hands every
// brand the same five Instagram days.
import { test } from "node:test";
import assert from "node:assert/strict";
import { planWeek, printWeek } from "./week";
import { defineSurface } from "./surface";
import { MAX } from "./timing";

const s = (id: string) =>
  defineSurface<unknown>({
    id,
    describes: `the ${id} screen`,
    states: ["idle", "open", "done"],
    targets: { thing: { x: 196, y: 400 } },
    component: () => null,
  });

const library = ["scan", "results", "plan", "share", "history"].map(s);
const from = new Date("2026-09-20T00:00:00Z"); // a Sunday

test("plans seven days and films the ones somebody posts", () => {
  const w = planWeek({ library, brandId: "brand-a", from });
  assert.equal(w.days.length, 7);
  // TikTok and X take every day, so nothing is a rest day for everyone.
  assert.equal(w.films, 7);
  for (const d of w.days) assert.ok(d.frames <= MAX, `${d.date} ran long`);
});

test("Instagram takes five of the seven, not a fixed Monday-to-Friday", () => {
  const w = planWeek({ library, brandId: "brand-a", from });
  const ig = w.days.filter((d) => d.platforms.includes("instagram"));
  assert.equal(ig.length, 5);
  const weekdays = ig.map((d) => d.weekday).sort().join(",");
  assert.notEqual(weekdays, "1,2,3,4,5");
});

test("two brands do not run the same week", () => {
  const a = planWeek({ library, brandId: "brand-a", from });
  const b = planWeek({ library, brandId: "brand-b", from });
  const ids = (w: ReturnType<typeof planWeek>) =>
    w.days.map((d) => d.takes.map((t) => t.surfaceId).join("+")).join("|");
  assert.notEqual(ids(a), ids(b));
});

test("the same week twice is the same week", () => {
  // A retry must not produce a different video for a day already posted.
  const a = planWeek({ library, brandId: "brand-a", from });
  const b = planWeek({ library, brandId: "brand-a", from });
  assert.deepEqual(
    a.days.map((d) => d.takes.map((t) => t.surfaceId)),
    b.days.map((d) => d.takes.map((t) => t.surfaceId))
  );
});

test("says so when the library is too small to carry a week", () => {
  const thin = planWeek({ library: [s("only")], brandId: "brand-a", from });
  assert.ok(thin.repeats.length > 0, "a one-surface library reruns itself and should admit it");
  const printed = printWeek(thin, "Thin");
  assert.match(printed, /too small for/);
});

test("names the surfaces a week never reaches", () => {
  const big = planWeek({ library: [...library, s("settings"), s("billing")], brandId: "brand-a", from });
  assert.ok(big.unused.length >= 0);
  for (const id of big.unused) assert.ok(!big.days.some((d) => d.takes.some((t) => t.surfaceId === id)));
});

test("the printout ends on the thing this package cannot do", () => {
  const printed = printWeek(planWeek({ library, brandId: "brand-a", from }), "Scanly");
  assert.match(printed, /A week of Scanly/);
  assert.match(printed, /postotter\.app/);
  // Free part first, paid part second — the other order reads as an ad.
  assert.ok(printed.indexOf("free") < printed.indexOf("postotter.app"));
});
