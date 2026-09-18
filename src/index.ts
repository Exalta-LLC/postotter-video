// The film grammar: what moves, when, and never what it looks like.
//
// A customer's agent writes SURFACES — their screens, in their components, with
// their tokens. This supplies the edit: the timing of a tap, the length of a
// hold, where a cut lands, where a caption may sit without the platform
// covering it up. It imposes no colour, no type, no layout and no shape.
//
// See SKILL.md for how a surface is authored. The short version:
//
//   defineSurface({ id, describes, states, targets, motion, component })
//
// where the component is a pure function of (state, data) that never reads the
// frame. Everything about WHEN lives here instead.
export { defineSurface, restingState } from "./surface";
export type { Surface, SurfaceProps, SurfaceState } from "./surface";

export { resolveShot, stateAt, transitionFrames } from "./beats";
export type { Beat, ResolvedBeat, ResolvedShot } from "./beats";

export { Shot, validateShot, opensClean } from "./Shot";
export { Film, planFilm, fits, bandFor } from "./Film";
export type { Take } from "./Film";
export { Device, SCREEN_W, SCREEN_H, SCREEN_ASPECT } from "./Device";
export { Caption, captionWords, captionInk } from "./Caption";
export { Pointer } from "./Pointer";
export { BrandCss } from "./BrandCss";

export { beatsFor, pickSurfaces, planShoot, worthRendering } from "./shoot";
export { planWeek, printWeek } from "./week";
export type { WeekPlan, DayPlan } from "./week";
export type { TakeSpec, CaptionBrief } from "./shoot";
export { captionPrompt } from "./captionPrompt";
export type { CopyContext } from "./captionPrompt";

export * from "./timing";
export { SAFE, safeBox, CAPTION_BASELINE, REF_W, REF_H } from "./safeArea";
