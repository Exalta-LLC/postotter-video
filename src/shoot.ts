// A day, a surface library, and what to film.
//
// The grammar knows how a shot moves. This decides WHICH screens get shot and
// WHAT HAPPENS in them — the step between "here are twelve surfaces" and "here
// is Tuesday's video".
//
// Deliberately model-free. Everything here is arithmetic over the library and
// the date, so a whole week can be planned, asserted and looked at before a
// single token is spent, and a run that is going to be wrong is wrong cheaply.
// The only thing a model writes is the caption, and that comes later against a
// brief this file produces.
//
// ── why the beats come from the states ──────────────────────────────
//
// A surface already declares everything needed to walk it: its states in order,
// and the targets a finger can land on. So the default script is "go through
// this screen the way a user would" — start at rest, move to each next state,
// tapping where there is something to tap and swiping where there is not.
//
// That is not a creative decision dressed up as a default. A product screen
// exists to be moved through, and the order of its states IS the order a user
// meets them. A script that wanted something else would be asserting something
// about the product that the surface did not say.

import type { Beat } from "./beats";
import { type Surface } from "./surface";
import { MAX, TARGET, holdFor } from "./timing";
import { resolveShot } from "./beats";

/** What a caption has to do in a given take. The engine hands this to the copy
 *  model; the model never sees the beats or the frame counts. */
export interface CaptionBrief {
  /** The surface's own sentence about itself. */
  describes: string;
  /** The states this take passes through, so the caption can talk about what
   *  actually happens rather than about the product in general. */
  states: string[];
  /** Roughly how many words will fit — see holdFor. A caption longer than this
   *  widens the shot, which is allowed, but a caption twice this long turns a
   *  15-second video into a slideshow. */
  words: number;
}

export interface TakeSpec {
  surfaceId: string;
  beats: Beat[];
  brief: CaptionBrief;
}

/** Words a caption can carry before it starts stretching the edit. */
const CAPTION_WORDS = 7;

/**
 * Walk a surface through its own states.
 *
 * Taps where the surface named a target for the state it is entering, swipes
 * where it did not. A `type` beat is not inferred: typing needs text, and text
 * is content, which is not this file's business.
 */
export function beatsFor(s: Surface): Beat[] {
  const beats: Beat[] = [];
  const onward = s.states.slice(1);

  // Open on the resting state long enough to be read. Frame 0 is the grid
  // thumbnail, so the video may never open mid-move.
  beats.push({ kind: "hold", words: 5 });

  for (const [i, state] of onward.entries()) {
    const target = targetFor(s, state, i);
    if (target) {
      beats.push({ kind: "tap", target, then: state });
    } else {
      beats.push({ kind: "swipe", direction: "up", then: state });
    }
    beats.push({ kind: "hold", words: i === onward.length - 1 ? 6 : 4 });
  }

  return beats;
}

/** The target a state is reached through, if the surface named one. Matches by
 *  the state's own name first, then falls back to declaration order — a surface
 *  with one target and one transition means the two go together. */
function targetFor(s: Surface, state: string, i: number): string | undefined {
  const names = Object.keys(s.targets ?? {});
  if (names.length === 0) return undefined;
  const byName = names.find(
    (n) => n.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(n.toLowerCase())
  );
  return byName ?? names[i];
}

/**
 * Which surfaces get filmed today.
 *
 * The week arc names an intent; `describes` is the only thing a surface says
 * about itself in words, so the match is made there. Deterministic in
 * (brandId, periodKey) like every other rotation in the product, so two days
 * running do not open on the same screen and a retry produces the same video.
 */
export function pickSurfaces(
  library: Surface[],
  brandId: string,
  periodKey: string,
  count = 2
): Surface[] {
  if (library.length <= count) return library;
  const pool = [...library];
  let seed = hash32(`${brandId}:${periodKey}:shoot`);
  const out: Surface[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    seed = hash32(`${seed}`);
    out.push(...pool.splice(seed % pool.length, 1));
  }
  return out;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Plan a day's shoot: which surfaces, what happens in them, what the captions
 * have to do. No model, no render, no cost.
 *
 * Trims from the end rather than shipping long. A 15-second target with a hard
 * ceiling at 22 is not a suggestion — a reel that runs past it is a reel people
 * stop watching, and the first draft of this pipeline drifted to 20.3s precisely
 * because the number lived in prose instead of in a check.
 */
export function planShoot(opts: {
  library: Surface[];
  brandId: string;
  periodKey: string;
  takes?: number;
}): { takes: TakeSpec[]; frames: number; trimmed: boolean } {
  const chosen = pickSurfaces(opts.library, opts.brandId, opts.periodKey, opts.takes ?? 2);

  let specs: TakeSpec[] = chosen.map((s) => {
    const beats = beatsFor(s);
    return {
      surfaceId: s.id,
      beats,
      brief: {
        describes: s.describes,
        states: [...s.states],
        words: CAPTION_WORDS,
      },
    };
  });

  const length = (list: TakeSpec[]) =>
    list.reduce((total, t, i) => {
      const shot = resolveShot(t.beats, chosen[i].states[0]);
      return total + Math.max(shot.frames, holdFor(t.brief.words));
    }, 0);

  let trimmed = false;
  while (specs.length > 1 && length(specs) > MAX) {
    specs = specs.slice(0, -1);
    trimmed = true;
  }

  return { takes: specs, frames: length(specs), trimmed };
}

/** Whether a planned shoot is worth rendering. Short is as bad as long: a
 *  four-second reel reads as a mistake. */
export function worthRendering(frames: number): boolean {
  return frames >= TARGET * 0.45 && frames <= MAX;
}
