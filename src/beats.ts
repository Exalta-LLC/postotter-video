// A shot is a list of beats. This turns that list into frames.
//
// Kept apart from the components that draw it so the whole edit can be
// computed, asserted and adjusted without rendering a pixel — which is what
// makes it testable, and what lets the engine fit a script to a target length
// before it commits to it.
//
// The beats are the verbs an editor actually uses. There are six, and that is
// close to all of them: hold on a screen, tap something, type something,
// swipe, push the camera in, cut. Everything else is a combination.

import type { SurfaceState } from "./surface";
import {
  PUSH_IN,
  SETTLE_BEFORE_CUT,
  SWIPE,
  TAP_LATENCY,
  TAP_PRESS,
  TAP_TOTAL,
  POINTER_TRAVEL,
  holdFor,
  typeFor,
} from "./timing";

export type Beat =
  /** Sit on the current state. `words` is the on-screen copy the viewer is
   *  meant to read, which is what sets the length — see holdFor. */
  | { kind: "hold"; words?: number; frames?: number }
  /** Touch a named target, then move to a new state. The pointer travels,
   *  lands, and the state changes AFTER it — see TAP_LATENCY. */
  | { kind: "tap"; target: string; then: SurfaceState }
  /** Type into a field, then optionally settle into a new state.
   *
   *  `into` names the key of the surface's own data that the text lands in, so
   *  the characters actually appear one by one. Without it a `type` beat just
   *  waits and the field shows its final value from frame 0 — which is what the
   *  first real render did, and it looked like the text was always there. */
  | { kind: "type"; target: string; text: string; into?: string; then?: SurfaceState }
  /** A swipe or scroll gesture, optionally landing in a new state. */
  | { kind: "swipe"; direction: "up" | "down" | "left" | "right"; then?: SurfaceState }
  /** Move the camera closer. Says "look here" and nothing else. */
  | { kind: "pushIn" };

/** A beat with its place on the timeline worked out. */
export interface ResolvedBeat {
  beat: Beat;
  from: number;
  to: number;
  /** The state the surface draws for the FIRST part of this beat. */
  state: SurfaceState;
  /** The state it draws after the beat's transition lands, if it has one. */
  becomes?: SurfaceState;
  /** Frame the transition happens on, for beats that have one. Not the start
   *  of the beat: a tap's state change lands after the finger does. */
  transitionAt?: number;
}

/** Frames a state change takes, from the product's own motion. Falls back to a
 *  neutral 280ms only when a surface declares nothing. */
export function transitionFrames(motion?: { ms: number }): number {
  return Math.round(((motion?.ms ?? 280) / 1000) * 30);
}

export interface ResolvedShot {
  beats: ResolvedBeat[];
  /** Total length including the settle before the cut. */
  frames: number;
  /** Every state this shot passes through, in order. */
  states: SurfaceState[];
}

function beatLength(b: Beat): number {
  switch (b.kind) {
    case "hold":
      return b.frames ?? holdFor(b.words ?? 0);
    case "tap":
      return TAP_TOTAL;
    case "type":
      return POINTER_TRAVEL + typeFor(b.text.length) + TAP_LATENCY;
    case "swipe":
      return SWIPE;
    case "pushIn":
      return PUSH_IN;
  }
}

/** Where inside a beat its state change lands, if any. */
function transitionOffset(b: Beat): number | undefined {
  switch (b.kind) {
    case "tap":
      // After the finger has been down and come up. This is the whole reason
      // a tap does not read as an animation.
      return POINTER_TRAVEL + TAP_PRESS + TAP_LATENCY;
    case "type":
      return POINTER_TRAVEL + typeFor(b.text.length) + TAP_LATENCY;
    case "swipe":
      return SWIPE;
    default:
      return undefined;
  }
}

/**
 * Lay a shot's beats out on a timeline.
 *
 * The shot always ends on a settled state — SETTLE_BEFORE_CUT is added at the
 * end rather than being a beat someone has to remember. A cut that lands while
 * something is still easing reads as a dropped frame, not as an edit, and it
 * is the most common failure in generated video.
 */
export function resolveShot(
  beats: Beat[],
  initial: SurfaceState
): ResolvedShot {
  const out: ResolvedBeat[] = [];
  const states: SurfaceState[] = [initial];
  let at = 0;
  let state = initial;

  for (const beat of beats) {
    const len = beatLength(beat);
    const off = transitionOffset(beat);
    const becomes =
      "then" in beat && beat.then && beat.then !== state ? beat.then : undefined;

    out.push({
      beat,
      from: at,
      to: at + len,
      state,
      becomes,
      transitionAt: becomes && off !== undefined ? at + off : undefined,
    });

    if (becomes) {
      state = becomes;
      states.push(becomes);
    }
    at += len;
  }

  return { beats: out, frames: at + SETTLE_BEFORE_CUT, states };
}

/** What the surface should be drawing on a given frame of a resolved shot. */
export function stateAt(shot: ResolvedShot, frame: number): SurfaceState {
  let state = shot.beats[0]?.state ?? "";
  for (const b of shot.beats) {
    if (frame < b.from) break;
    state = b.state;
    if (b.becomes && b.transitionAt !== undefined && frame >= b.transitionAt) {
      state = b.becomes;
    }
  }
  return state;
}
