// Shots, cut together.
//
// One shot is a clip. An edit is several, cut on the beat, with words over
// them — and that difference is most of what separates "somebody filmed this
// product" from "a UI animated itself".
//
// ── what a cut is here ──────────────────────────────────────────────
//
// A hard cut with the edge taken off: CUT_BLEND is two frames, which the eye
// reads as a cut rather than as a transition. Not a dissolve. Dissolving
// between two screens of the same app reads as a slideshow, and slideshows are
// what this is trying not to be.
//
// The cut lands where the outgoing shot has already settled — resolveShot adds
// SETTLE_BEFORE_CUT to every shot for exactly this — so nothing is ever caught
// mid-ease at the join. That is the most common failure in generated video and
// it is handled once, here, rather than being every author's problem.

import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { BrandCss } from "./BrandCss";
import { Caption, captionWords } from "./Caption";
import { Device } from "./Device";
import { Shot } from "./Shot";
import { resolveShot, type Beat } from "./beats";
import type { Surface } from "./surface";
import { CUT_BLEND, MAX, TARGET, holdFor } from "./timing";
import { REF_H, SAFE } from "./safeArea";

/** Height a caption block needs above the safe floor: the accent rule, the gap
 *  and up to two lines of 62px type. Two lines is the cap because a third is a
 *  paragraph, and nobody reads a paragraph off a reel. */
const CAPTION_BAND = 250;

/** The slice of frame a captioned shot may use. Footage up, words under. */
export const bandFor = (captioned: boolean) =>
  captioned
    ? { top: 0, bottom: (REF_H - SAFE.bottom - CAPTION_BAND) / REF_H }
    : undefined;

/** One shot of the edit: a surface, what happens to it, and what to call it. */
export interface Take<D = unknown> {
  surface: Surface<D>;
  data: D;
  beats: Beat[];
  /** The words over this shot. One per take — see Caption. */
  caption?: string;
}

/**
 * Lay the takes out on a timeline.
 *
 * A take carrying a caption is widened if it would otherwise cut before the
 * caption can be read. The caption is not decoration on top of a shot that was
 * already timed; it is a thing the viewer has to get through, and the shot owes
 * it the seconds.
 */
export function planFilm(takes: Take<never>[] | Take<any>[]): {
  at: number[];
  frames: number[];
  total: number;
} {
  const frames: number[] = [];
  const at: number[] = [];
  let cursor = 0;
  for (const t of takes) {
    const shot = resolveShot(t.beats, t.surface.states[0]);
    const needed = t.caption ? holdFor(captionWords(t.caption)) : 0;
    // The caption has to fit inside the shot, not after it.
    const len = Math.max(shot.frames, needed + CUT_BLEND);
    at.push(cursor);
    frames.push(len);
    cursor += len;
  }
  return { at, frames, total: cursor };
}

export const Film = <D,>({
  takes,
  ground,
  accent,
  css,
  fontUrl,
}: {
  takes: Take<D>[];
  ground: string;
  accent: string;
  /** The customer's own compiled stylesheet, so surfaces can be written in
   *  their class names rather than in our translation of their tokens. */
  css?: string;
  /** Their webfont, from their own index.html. Held until loaded — see
   *  BrandCss: a font still in flight renders as the fallback. */
  fontUrl?: string;
}) => {
  const frame = useCurrentFrame();
  const plan = React.useMemo(() => planFilm(takes), [takes]);

  return (
    <AbsoluteFill style={{ background: ground }}>
      {css ? <BrandCss css={css} fontUrl={fontUrl} /> : null}
      {takes.map((t, i) => {
        const from = plan.at[i];
        const len = plan.frames[i];
        // Two frames of blend on the incoming shot. The outgoing one is simply
        // underneath and stops; nothing fades OUT, because a cut does not.
        const blend =
          i === 0
            ? 1
            : interpolate(frame, [from, from + CUT_BLEND], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
        return (
          <Sequence key={i} from={from} durationInFrames={len} layout="none">
            <AbsoluteFill style={{ opacity: blend }}>
              <Device ground={ground} band={bandFor(!!t.caption)}>
                <Shot
                  surface={t.surface}
                  data={t.data}
                  beats={t.beats}
                  accent={accent}
                />
              </Device>
              {t.caption ? (
                <Caption text={t.caption} frames={len} accent={accent} ground={ground} />
              ) : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Whether an edit is a shippable length. The engine trims or extends takes
 *  against this rather than shipping whatever came out. */
export function fits(total: number): { ok: boolean; why?: string } {
  if (total > MAX)
    return { ok: false, why: `${total} frames is over MAX (${MAX})` };
  if (total < TARGET * 0.45)
    return { ok: false, why: `${total} frames is too short to read` };
  return { ok: true };
}
