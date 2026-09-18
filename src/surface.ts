// What a surface is, and what it is forbidden from knowing.
//
// A SURFACE is one screen of a customer's product, rebuilt for film. Their
// agent writes it, from their own components and design tokens, because only
// something inside their repo knows what their UI looks like. It is the
// "recording" half of "a social media manager took a recording and edited it".
//
// ── the one rule ────────────────────────────────────────────────────
//
// A surface is a pure function of (state, data). It renders "the proposal
// card, not yet accepted" or "the proposal card, accepted". It never reads the
// frame, never interpolates, never decides when anything happens.
//
// This is the line the reference implementation does not draw, and it is worth
// being precise about why. a reference implementation's own screen component takes its data as
// props AND runs its own choreography inline — `const accepted = frame >= 84`,
// `interpolate(frame, [68, 76, 86, 96], ...)`. It works. It also means the
// timing is welded to that one screen, so every new screen re-invents it, the
// numbers drift apart, and you end up needing timing.test.ts to hold them
// together. (The repo that did it has one, plus a formats test and a layout test.)
//
// Separate them and both halves get simpler. The surface only has to know how
// to look right in each of its states, which is a question about their design
// system. The grammar only has to know when to move between them, which is a
// question about editing. Neither needs to know the other exists.
//
// It also means their agent's job shrinks to something it is genuinely good
// at: "draw this screen in these states with this data, using your own
// components". No frame maths, no easing curves, no opinion about pacing —
// the three things it would get wrong and would not know it had got wrong.

import type React from "react";

/** A state a surface can be in. Their agent names these; we never guess them.
 *  "idle", "accepted", "sending", "empty", "error" — whatever the screen
 *  actually does. */
export type SurfaceState = string;

/**
 * The props every surface receives, and the only ones it may.
 *
 * Deliberately has no `frame`, no `progress`, no `durationInFrames`. A surface
 * that wants those is a surface doing the grammar's job, and it will fight
 * every edit it is ever placed in.
 */
export interface SurfaceProps<D = unknown> {
  /** Which state to draw. Always one of the surface's declared states. */
  state: SurfaceState;
  /** The synthetic content. Their agent generates this from their own
   *  TypeScript types, so it is shaped like real data without being any. */
  data: D;
}

/**
 * A surface, plus what the grammar needs to know to drive it.
 *
 * `states` and `targets` are the contract. The grammar reads them to know what
 * it is allowed to ask for — a `Tap` at a target that does not exist, or a
 * transition to a state that was never declared, fails at build time rather
 * than rendering something wrong and silent.
 */
export interface Surface<D = unknown> {
  /** Stable id, used in scripts and in the props the engine fills. */
  id: string;
  /** What this screen is, in the product's own words. Written by their agent;
   *  read by the copy engine when it decides what the post is about. */
  describes: string;
  /** Every state this surface can draw. The first is its resting state. */
  states: readonly SurfaceState[];
  /**
   * Named tap targets, in the surface's own 393×852 viewport (see Device).
   *
   * Pixels rather than fractions, because a surface is now authored at a real
   * phone size against the customer's real stylesheet — so "the second card is
   * at y=232" is something you can read off the layout, while "y=0.37" was
   * always a guess, and it showed: the first taps landed on empty space.
   */
  targets?: Record<string, { x: number; y: number }>;
  /**
   * How THIS PRODUCT moves between its own states — read off its CSS, its
   * Tailwind config or its animation constants, never invented.
   *
   * One real app's bottom sheet snaps on `max-height 350ms cubic-bezier(0.32,0.72,0,1)`
   * and enters on `0.45s cubic-bezier(0.16,1,0.3,1)`. Those two curves are as
   * much a part of how that app feels as its colour is. A generic cross-fade in
   * their place is our signature on their product.
   *
   * Declaring is not choreographing: the surface says how the app moves, the
   * grammar decides when it moves. The contract holds.
   */
  motion?: { ms: number; easing: string };
  component: React.FC<SurfaceProps<D>>;
}

/** Helper so a surface file reads as a declaration rather than as an object
 *  literal, and so the generic is inferred from the component. */
export function defineSurface<D>(s: Surface<D>): Surface<D> {
  return s;
}

/** The resting state — what a surface draws when nothing has happened yet, and
 *  what frame 0 shows. See POSTER_HEAD in timing.ts: frame 0 is the grid
 *  thumbnail on both platforms, so it is never mid-animation. */
export const restingState = (s: Surface): SurfaceState => s.states[0];
