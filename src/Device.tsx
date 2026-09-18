// A screen needs something to be a screen OF.
//
// A surface authored at page scale, dropped into a 9:16 frame, sits in the top
// third with the bottom two thirds empty — which is exactly the failure the
// relief mechanism had, arrived at from the opposite direction. The customer's
// UI is not the composition; it is the subject of one.
//
// So it goes in a device, and the device does three jobs at once:
//
//   1. Fills the frame, because a phone is 9:19.5 and the frame is 9:16.
//   2. Says "this is software", instantly, with no caption doing that work.
//   3. Gives the surface a fixed aspect to be authored against, so a surface
//      written once looks right in a 9:16 reel, a 1:1 post and a 16:9 card
//      without being rewritten for each.
//
// Deliberately generic hardware: rounded glass, a thin bezel, no notch, no
// island, no home indicator, no brand. A recognisable handset dates the video
// the moment that handset does, and picks a side in an argument the customer
// did not ask us to have.

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

/** The phone a surface is authored against, in REAL CSS pixels.
 *
 *  This is the difference between a surface that uses the customer's stylesheet
 *  and one that merely borrows its colours. Their `text-base` is 16px because
 *  their app runs on a ~390px-wide screen; drop the same class into a 1080px
 *  box and it renders as a caption. Author at the phone's own size and scale the
 *  whole thing up, and every class — type scale, padding, radius, shadow, the
 *  44px tap targets — is exactly the size it is in their product.
 *
 *  iPhone 14/15 logical resolution, which is what most design systems target. */
export const SCREEN_W = 393;
export const SCREEN_H = 852;
export const SCREEN_ASPECT = SCREEN_W / SCREEN_H;

/** Bezel width. Enough to read as hardware, not enough to be anyone's. */
const BEZEL = 14;

export const Device: React.FC<{
  children: React.ReactNode;
  /** The page behind the device. Their background token, usually. */
  ground: string;
  /** How much of the available height the device occupies. */
  fill?: number;
  /**
   * The band of the frame the device may use, as fractions of height.
   *
   * A captioned shot gives the device the room ABOVE the caption, because the
   * two cannot share the floor. Filling the screen properly is what made this
   * necessary: a surface that ends in a bottom sheet, a tab bar or a sticky CTA
   * puts its most important control exactly where the caption sits, and the two
   * then overprint. Real edits solve it the same way — footage up, words under.
   */
  band?: { top: number; bottom: number };
}> = ({ children, ground, fill = 0.9, band }) => {
  const { height: frameH } = useVideoConfig();
  const top = band?.top ?? 0;
  const bottom = band?.bottom ?? 1;
  // How much bigger the rendered phone is than a real one. Everything inside is
  // authored at SCREEN_W, so this is the only number that magnifies it.
  const phoneH = (bottom - top) * frameH * fill;
  // The bezel eats BEZEL on each side, so the glass is narrower than the case.
  // Scaling to the case overflows the screen by exactly that much.
  const glassW = phoneH * SCREEN_ASPECT - BEZEL * 2;
  const scale = glassW / SCREEN_W;
  return (
    <AbsoluteFill
      style={{
        background: ground,
        alignItems: "center",
        justifyContent: "center",
        top: `${top * 100}%`,
        height: `${(bottom - top) * 100}%`,
      }}
    >
      <div
        style={{
          position: "relative",
          height: `${fill * 100}%`,
          aspectRatio: `${SCREEN_ASPECT}`,
          borderRadius: 64,
          // A bezel, not a phone. Enough to read as hardware, not enough to be
          // anyone's hardware.
          padding: BEZEL,
          background: "#0B1220",
          boxShadow:
            "0 40px 90px rgba(11,18,32,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 52,
            overflow: "hidden",
            background: ground,
          }}
        >
          {/* The surface lives in a real phone viewport and the whole viewport
              is scaled. Nothing inside knows it has been magnified, so their
              CSS behaves exactly as it does on a handset. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SCREEN_W,
              height: SCREEN_H,
              transformOrigin: "top left",
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
