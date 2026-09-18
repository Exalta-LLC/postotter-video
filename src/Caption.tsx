// The words over the picture.
//
// A caption is the one thing in a shot that is ours rather than the customer's,
// and it earns its place by doing a job the UI cannot: saying what the viewer
// is looking at, in the half second before they decide whether to keep looking.
// A screen recording with no caption is a product demo. With one it is a post.
//
// ── three rules, and each of them is a thing generated video gets wrong ──
//
// ONE CAPTION PER SHOT. It arrives with the cut and leaves with it. A caption
// that changes while the UI is also changing gives the eye two things to track
// and it tracks neither — and the UI is the subject, so the caption is the one
// that loses.
//
// NO PER-WORD ANIMATION. Karaoke captions read as a trend, and a trend dates
// the video the month it passes. The caption fades and lifts a few pixels,
// once, and then holds still so it can be read.
//
// IT SITS ON THE SAFE FLOOR. Not the bottom of the frame — see safeArea.ts.
// Under that line is TikTok's caption block and Instagram's username row.
//
// IT READS ON THEIR GROUND, NOT OURS. The first version hardcoded near-black
// ink with a white glow behind it, which is correct for a light product and
// invisible on a dark one. Found the first time this ran against a second
// brand: a dark product on #121215 with an orange accent, where the caption vanished
// into the background. So the ink is chosen from the ground's luminance. Any
// fixed colour here is a bet that every customer has the same theme.

import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CUT_BLEND, sec } from "./timing";
import { REF_H, REF_W, SAFE } from "./safeArea";

const IN = sec(0.34);

/** Perceived lightness of a hex colour, 0–1. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = n.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ink and halo for a caption sitting on `ground`. Exported so the choice is
 *  testable without rendering, and so a surface never has to guess it. */
export function captionInk(ground: string): { ink: string; halo: string } {
  const dark = luminance(ground) < 0.35;
  return { ink: dark ? "#FFFFFF" : "#0B1220", halo: dark ? "0,0,0" : "255,255,255" };
}

export const Caption: React.FC<{
  text: string;
  /** How long the shot this caption belongs to lasts, in frames. */
  frames: number;
  /** The brand's accent, used for the rule above the text and nothing else.
   *  A caption set entirely in a brand colour is a banner, not a caption. */
  accent: string;
  /** What the caption sits on. Decides whether the ink is dark or light. */
  ground: string;
}> = ({ text, frames, accent, ground }) => {
  const { ink, halo } = captionInk(ground);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const k = width / REF_W;

  // In quickly, out on the cut. Never a slow fade: a caption dissolving while
  // the next shot is already arriving reads as a mistake in the edit.
  const enter = interpolate(frame, [0, IN], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const exit = interpolate(
    frame,
    [frames - CUT_BLEND - 2, frames - CUT_BLEND],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const on = enter * exit;
  if (on <= 0.001) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left * k,
        right: SAFE.right * k,
        // The floor of the safe box, lifted by its own height so the text sits
        // ON the line rather than starting at it.
        bottom: (SAFE.bottom / REF_H) * height,
        opacity: on,
        transform: `translateY(${(1 - enter) * 16 * k}px)`,
        pointerEvents: "none",
      }}
    >
      {/* A short rule in the brand's colour. It is the only brand mark the
          caption carries, and it is what stops white type on a light UI from
          reading as a system notification. */}
      <div
        style={{
          width: 96 * k,
          height: 7 * k,
          borderRadius: 4 * k,
          background: accent,
          marginBottom: 22 * k,
        }}
      />
      <div
        style={{
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          fontSize: 62 * k,
          lineHeight: 1.12,
          fontWeight: 800,
          letterSpacing: -1.4 * k,
          color: ink,
          // The halo is the ground's own colour, so the words separate from
          // whatever is behind them without a slab or a box.
          textShadow: `0 2px 18px rgba(${halo},0.75), 0 1px 3px rgba(${halo},0.9)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Captions are read, so a shot carrying one has to hold long enough to read
 *  it. The engine uses this to widen a shot that would otherwise cut early. */
export const captionWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;
