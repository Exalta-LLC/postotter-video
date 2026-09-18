// The touch.
//
// This was a soft disc that flew in, pressed, and flew out — a finger-shaped
// blob hovering over the UI. It read as a cursor, and a cursor is the one thing
// a phone does not have. Nobody recording their own app has a floating dot
// following their thumb around.
//
// What a real screen recording shows is nothing at all, or — with "show
// touches" on — a brief ripple where the finger landed. So that is what this is:
// a ring that expands out of the tap point and fades, over in a quarter of a
// second, gone before the state it triggered has finished changing.
//
// It has to exist in some form. Without it the UI changes on its own, which is
// a product demo rather than somebody using the product, and the whole point of
// TAP_LATENCY is to sell the causation. A ripple sells it in a fifth of the
// screen real estate and does not look like a mouse.

import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { POINTER_TRAVEL, TAP_PRESS, sec } from "./timing";
import { SCREEN_W, SCREEN_H } from "./Device";

/** The whole ripple, from contact to gone. */
const RIPPLE = sec(0.34);
const MAX_R = 46;

export const Pointer: React.FC<{
  /** Where the finger lands, in the surface's own 393×852 viewport. */
  to: { x: number; y: number };
  /** Frame the gesture starts, relative to the shot. */
  at: number;
  accent: string;
}> = ({ to, at, accent }) => {
  const frame = useCurrentFrame();
  // Contact is when the finger is down, not when the beat began — the travel
  // time still exists, it is simply no longer drawn.
  const contact = at + POINTER_TRAVEL;
  const t = frame - contact;
  if (t < -TAP_PRESS || t > RIPPLE) return null;

  const grow = interpolate(t, [0, RIPPLE], [0.35, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const fade = interpolate(t, [0, RIPPLE * 0.35, RIPPLE], [0.5, 0.34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (fade <= 0.001) return null;

  const r = MAX_R * grow;
  return (
    <div
      style={{
        position: "absolute",
        left: (to.x / SCREEN_W) * 100 + "%",
        top: (to.y / SCREEN_H) * 100 + "%",
        width: r * 2,
        height: r * 2,
        marginLeft: -r,
        marginTop: -r,
        borderRadius: "50%",
        background: accent,
        opacity: fade,
        pointerEvents: "none",
      }}
      aria-hidden
    />
  );
};
