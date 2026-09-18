// Seven days, planned before anything is spent.
//
// `planShoot` answers "what is Tuesday". This answers the question that actually
// decides whether someone keeps using this: what does a WEEK look like, and is
// it seven of the same video.
//
// It is the same arithmetic as a day — deterministic in (brandId, periodKey),
// no model, no render, no cost — run seven times and then checked for the
// failure a single day cannot see: the same surface opening two days running,
// or a library so small that the week repeats.
//
// ── why the cadence is opinionated ──────────────────────────────────
//
// A repo can tell an agent what the product does. It cannot tell it that TikTok
// wants something every day and Instagram does not, that the five Instagram days
// should not be the same five every week, or that two days in a row opening on
// the same screen reads as a bot. That is not in anyone's source tree; it comes
// from running a lot of brands and watching things fail, which is the whole
// reason this package is worth installing rather than reproducing.

import type { Surface } from "./surface";
import { type TakeSpec, planShoot } from "./shoot";
import { FPS } from "./timing";

/** What each platform expects in a calendar week. TikTok and X take something
 *  every day; Instagram at five is deliberate, and the five rotate. */
const CADENCE: Array<{ platform: string; daysPerWeek: number }> = [
  { platform: "tiktok", daysPerWeek: 7 },
  { platform: "instagram", daysPerWeek: 5 },
  { platform: "x", daysPerWeek: 7 },
];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Which weekdays a sub-weekly platform takes, dealt without replacement from the
 * brand and the week. Two brands get different days; one brand gets different
 * days next week. A fixed Mon–Fri would be the obvious implementation and it is
 * the one that makes every account on the platform look like the same account.
 */
function daysForWeek(brandId: string, platform: string, weekKey: string, count: number): Set<number> {
  const pool = [0, 1, 2, 3, 4, 5, 6];
  let seed = hash32(`${brandId}:${platform}:${weekKey}`);
  const chosen = new Set<number>();
  for (let i = 0; i < Math.min(count, 7); i++) {
    seed = hash32(`${seed}`);
    const idx = seed % pool.length;
    chosen.add(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen;
}

export interface DayPlan {
  /** YYYY-MM-DD, UTC. Also the periodKey the rotations are seeded on. */
  date: string;
  weekday: number;
  /** Who gets this day's film. Empty means a rest day for every platform. */
  platforms: string[];
  takes: TakeSpec[];
  frames: number;
  seconds: number;
}

export interface WeekPlan {
  days: DayPlan[];
  /** Films to render — days that somebody posts. */
  films: number;
  /** Posts that go out, which is more than films: one film can serve more than
   *  one platform on the same day. */
  posts: number;
  /** Surfaces the week never reaches. The honest measure of whether the library
   *  is big enough to keep going. */
  unused: string[];
  /** Days that are an exact rerun of an earlier day in the run. Two identical
   *  films four days apart is the failure a single day cannot see, and it is the
   *  one that makes an account look automated. */
  repeats: string[];
  /** Days that merely open on the same screen as the day before. Softer, but
   *  still worth knowing: the first second is what decides whether anyone
   *  watches the rest. */
  sameOpening: string[];
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Plan a run of days without spending anything.
 *
 * `from` defaults to today. `days` defaults to 7, but a longer run is the point
 * of the `unused` and `repeats` fields — a library that survives one week and
 * falls apart over three is a library that has not been tested.
 */
export function planWeek(opts: {
  library: Surface[];
  brandId: string;
  from?: Date;
  days?: number;
  takes?: number;
}): WeekPlan {
  const start = opts.from ?? new Date();
  const count = opts.days ?? 7;
  const days: DayPlan[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) + i * DAY_MS);
    const date = iso(d);
    const weekday = d.getUTCDay();
    // The calendar week this day belongs to, so a draw holds across it.
    const weekKey = iso(new Date(d.getTime() - weekday * DAY_MS));

    const platforms = CADENCE.filter(
      (c) => c.daysPerWeek >= 7 || daysForWeek(opts.brandId, c.platform, weekKey, c.daysPerWeek).has(weekday)
    ).map((c) => c.platform);

    // A day nobody posts is not planned — planning it would spend a rotation
    // draw on a film that never runs, and shift every later day sideways.
    if (platforms.length === 0) {
      days.push({ date, weekday, platforms, takes: [], frames: 0, seconds: 0 });
      continue;
    }

    const shoot = planShoot({
      library: opts.library,
      brandId: opts.brandId,
      periodKey: date,
      takes: opts.takes,
    });
    days.push({
      date,
      weekday,
      platforms,
      takes: shoot.takes,
      frames: shoot.frames,
      seconds: Math.round((shoot.frames / FPS) * 10) / 10,
    });
  }

  const filmed = days.filter((d) => d.takes.length > 0);
  const seen = new Set(filmed.flatMap((d) => d.takes.map((t) => t.surfaceId)));
  const repeats: string[] = [];
  const sameOpening: string[] = [];
  const seenRuns = new Set<string>();
  for (const [i, d] of filmed.entries()) {
    const run = d.takes.map((t) => t.surfaceId).join("+");
    if (seenRuns.has(run)) repeats.push(d.date);
    seenRuns.add(run);
    if (i > 0 && d.takes[0]?.surfaceId === filmed[i - 1].takes[0]?.surfaceId) sameOpening.push(d.date);
  }

  return {
    days,
    films: filmed.length,
    posts: days.reduce((n, d) => n + (d.takes.length ? d.platforms.length : 0), 0),
    unused: opts.library.map((s) => s.id).filter((id) => !seen.has(id)),
    repeats,
    sameOpening,
  };
}

/**
 * The week as something a person can look at.
 *
 * Deliberately ends on what this package cannot do. Rendering is the free part
 * and it runs here; the plan below is seven days of work that somebody or
 * something has to actually carry out on the days it names.
 */
export function printWeek(plan: WeekPlan, productName = "your product"): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  A week of ${productName}`);
  lines.push("");

  for (const d of plan.days) {
    const day = `${WEEKDAYS[d.weekday]} ${d.date.slice(5)}`;
    if (!d.takes.length) {
      lines.push(`    ${day}   —`);
      continue;
    }
    lines.push(
      `    ${day}   ${String(d.seconds).padStart(4)}s  ${d.takes
        .map((t) => t.surfaceId)
        .join(" → ")}`
    );
    lines.push(`${" ".repeat(16)}${d.platforms.join(", ")}`);
  }

  lines.push("");
  lines.push(`    ${plan.films} films, ${plan.posts} posts`);

  if (plan.unused.length) {
    lines.push(
      `    ${plan.unused.length} surface(s) the week never reaches: ${plan.unused.join(", ")}`
    );
  }
  const short = (dates: string[]) => dates.map((d) => d.slice(5)).join(", ");

  if (plan.repeats.length) {
    lines.push(
      `    reruns an earlier day: ${short(plan.repeats)} — the library is too small for ${plan.days.length} days`
    );
  }
  // Only the days that are not already named above. A run where the library is
  // too small trips both checks on the same six dates, and printing them twice
  // reads as two problems when it is one.
  const onlyOpening = plan.sameOpening.filter((d) => !plan.repeats.includes(d));
  if (onlyOpening.length) {
    lines.push(`    opens on the same screen as the day before: ${short(onlyOpening)}`);
  }

  lines.push("");
  lines.push("  You can render any one of these right now, for free:");
  lines.push("");
  lines.push("    npx remotion render postotter/index.ts MyFilm out/today.mp4");
  lines.push("");
  lines.push("  Running them on the days above, and posting them, is the part that");
  lines.push("  needs an account and a schedule: https://postotter.app");
  lines.push("");

  return lines.join("\n");
}
