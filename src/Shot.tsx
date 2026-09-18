// One surface, driven through its beats.
//
// This is where the two halves meet: a Surface the customer's agent wrote,
// and a script of beats we decided on. The surface is asked only ever for a
// state; everything about WHEN belongs here.
//
// Note what this component does not do. It does not fade the surface in, slide
// it, or decorate it. The customer's UI is the subject of the shot, and a
// generator that flourishes it is a generator putting its own signature on
// somebody else's product.
//
// ── transitions belong to the app, not to us ────────────────────────
//
// A state change used to be an instant swap, and before that the only motion
// in the vocabulary was a push-in — both of which are OUR idea of how a screen
// should move. The app already has one. A real app's sheet snaps on
// `max-height 350ms cubic-bezier(0.32,0.72,0,1)` and enters on
// `0.45s cubic-bezier(0.16,1,0.3,1)`; those curves are as much that app as its
// green is, and they are sitting in its Tailwind config.
//
// This is the advantage nobody else has. An editor working from a screen
// recording is stuck with whatever the app did. We are rebuilding the app, so
// we can play its real transition — and then imposing a generic zoom instead is
// throwing away the only thing that makes this authentic rather than templated.
//
// So: a surface declares its motion, and the change is blended on ITS curve.

import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Pointer } from "./Pointer";
import { resolveShot, stateAt, transitionFrames, type Beat, type ResolvedShot } from "./beats";
import type { Surface } from "./surface";
import { POINTER_TRAVEL, PUSH_IN, PUSH_IN_AMOUNT, POSTER_HEAD, typeFor } from "./timing";

/** A CSS cubic-bezier string, as Remotion's Easing. Their curve, not ours. */
function cubic(easing?: string) {
  const m = easing?.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return Easing.inOut(Easing.cubic);
  const [a, b, c, d] = m[1].split(",").map((n) => parseFloat(n.trim()));
  return [a, b, c, d].every((n) => Number.isFinite(n))
    ? Easing.bezier(a, b, c, d)
    : Easing.inOut(Easing.cubic);
}

export { resolveShot };

/**
 * The camera. Deliberately the LAST resort, and off unless a beat asks.
 *
 * A push-in is our flourish, not the product's. It is in the vocabulary because
 * an editor genuinely does punch in on a held frame — but a script that reaches
 * for it instead of showing the app's own motion is decorating a screen it
 * could have been playing.
 */
function usePush(shot: ResolvedShot, frame: number): number {
  let scale = 1;
  for (const b of shot.beats) {
    if (b.beat.kind !== "pushIn") continue;
    scale *= interpolate(frame, [b.from, b.from + PUSH_IN], [1, 1 + PUSH_IN_AMOUNT], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  }
  return scale;
}

export const Shot = <D,>({
  surface,
  data,
  beats,
  accent,
  initial,
}: {
  surface: Surface<D>;
  data: D;
  beats: Beat[];
  accent: string;
  /** Defaults to the surface's resting state — what frame 0 draws. */
  initial?: string;
}) => {
  const frame = useCurrentFrame();
  const shot = React.useMemo(
    () => resolveShot(beats, initial ?? surface.states[0]),
    [beats, initial, surface.states]
  );

  const state = stateAt(shot, frame);
  const scale = usePush(shot, frame);
  const Body = surface.component;

  // The change in progress, if any, on the product's own duration and curve.
  const tFrames = transitionFrames(surface.motion);
  const active = shot.beats.find(
    (b) =>
      b.transitionAt !== undefined &&
      frame >= b.transitionAt &&
      frame < b.transitionAt + tFrames
  );
  const blend = active
    ? interpolate(frame, [active.transitionAt!, active.transitionAt! + tFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: cubic(surface.motion?.easing),
      })
    : 1;

  // Typing in progress: hand the surface a data object whose field holds only
  // the characters entered so far. The surface still just renders (state, data)
  // and knows nothing about time.
  let shown = data;
  for (const b of shot.beats) {
    if (b.beat.kind !== "type" || !b.beat.into) continue;
    const startAt = b.from + POINTER_TRAVEL;
    const dur = typeFor(b.beat.text.length);
    if (frame < startAt) {
      shown = { ...(shown as object), [b.beat.into]: "" } as D;
    } else if (frame < startAt + dur) {
      const n = Math.round(((frame - startAt) / dur) * b.beat.text.length);
      shown = { ...(shown as object), [b.beat.into]: b.beat.text.slice(0, n) } as D;
    }
  }

  // Every tap in the shot that is currently on screen. A shot may contain
  // several; the Pointer decides for itself when it is not wanted.
  const taps = shot.beats.filter(
    (b) => b.beat.kind === "tap" || b.beat.kind === "type"
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 45%" }}>
        {/* The customer's screen. Asked for a state, nothing else. During a
            change the outgoing state is still underneath, so the two cross on
            the product's own curve rather than cutting. */}
        {active && blend < 1 ? <Body state={active.state} data={shown} /> : null}
        <AbsoluteFill style={{ opacity: blend }}>
          <Body state={state} data={shown} />
        </AbsoluteFill>

        {taps.map((b, i) => {
          const target =
            "target" in b.beat ? surface.targets?.[b.beat.target] : undefined;
          if (!target) return null;
          return <Pointer key={i} to={target} at={b.from} accent={accent} />;
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * A tap aimed at a target the surface never declared is a silent wrong render:
 * the pointer simply does not appear and the state changes on its own, which
 * is the exact failure the hand exists to prevent. So it is checked, loudly,
 * before anything is rendered.
 */
export function validateShot(surface: Surface, beats: Beat[]): string[] {
  const errors: string[] = [];
  const states = new Set(surface.states);
  for (const [i, b] of beats.entries()) {
    if ("target" in b && b.target && !surface.targets?.[b.target]) {
      errors.push(
        `beat ${i} (${b.kind}) aims at "${b.target}", which ${surface.id} does not declare`
      );
    }
    if ("then" in b && b.then && !states.has(b.then)) {
      errors.push(
        `beat ${i} (${b.kind}) moves to "${b.then}", which ${surface.id} cannot draw`
      );
    }
  }
  return errors;
}

/** Frame 0 is the grid thumbnail on Instagram and TikTok both, so a video may
 *  never open on something mid-animation. A script whose first beat transitions
 *  inside this window opens on a blur. */
export function opensClean(shot: ResolvedShot): boolean {
  return !shot.beats.some(
    (b) => b.transitionAt !== undefined && b.transitionAt < POSTER_HEAD
  );
}
