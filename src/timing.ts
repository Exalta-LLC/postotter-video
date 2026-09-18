// How long things take, and why.
//
// This is the edit, not the artwork. Every number here came from a question an
// editor answers without thinking about and a generator gets wrong every time:
// how long do you sit on a screen nobody has seen before, how long after a
// finger lands does the thing it touched respond, when is a cut too early.
//
// It is one file for the reason motion.ts is one file: beats that are timed
// ALIKE read as one edit, and beats that each pick their own numbers read as
// clips stuck together. A change to the feel of every video is a change here.
//
// Everything is in frames at FPS. Frame-derived and deterministic: same frame,
// same value, every render.
//
// ── what this is NOT ────────────────────────────────────────────────
//
// It is not a look. It imposes no colour, no type, no layout, no shape. The
// surfaces it drives belong to the customer and are built from their own
// components and tokens. This file only decides WHEN, which is the half of
// filmmaking that a repo cannot supply and a founder's agent does not know it
// is missing.

export const FPS = 30;

/** Seconds → frames, rounded. Everything below is authored in seconds because
 *  that is the unit an edit is discussed in. */
export const sec = (s: number): number => Math.round(s * FPS);

/* ── reading time ───────────────────────────────────────────────── */

/**
 * How long a viewer needs on a screen they have never seen.
 *
 * The instinct is to cut fast because fast reads as energetic. It does, and it
 * also means nobody learns what the product does — which is the entire job.
 * A UI screen is not a title card: there is a layout to parse before any of the
 * words land.
 *
 * So the floor is deliberately slow by social-video standards, and the ceiling
 * exists because past it the viewer has finished and is now waiting.
 */
export const HOLD_MIN = sec(1.1);
export const HOLD_MAX = sec(2.6);

/** Extra frames per word of on-screen copy the viewer is meant to actually
 *  read. ~4 words/second is comfortable; this is deliberately more generous
 *  than that because they are also looking at an interface. */
export const PER_WORD = Math.round(FPS / 3.2);

/** How long to hold a surface carrying `words` of readable copy. */
export function holdFor(words: number): number {
  return Math.max(HOLD_MIN, Math.min(HOLD_MAX, HOLD_MIN + words * PER_WORD));
}

/* ── the hand ───────────────────────────────────────────────────── */

/**
 * A tap is three events, not one, and getting the order wrong is the single
 * clearest tell that nobody filmed this.
 *
 * The pointer travels, it lands, and only THEN does the interface react. Real
 * software has a frame or two of latency and a human has reaction time; a
 * state that flips on the same frame as the finger arrives reads as a
 * scripted animation, because it is one.
 */
export const POINTER_TRAVEL = sec(0.38);
/** Finger down to finger up. */
export const TAP_PRESS = sec(0.13);
/** Finger up to the interface responding. The tell. Never zero. */
export const TAP_LATENCY = sec(0.09);
/** Whole gesture, from pointer appearing to the new state being live. */
export const TAP_TOTAL = POINTER_TRAVEL + TAP_PRESS + TAP_LATENCY;

/** Characters per second for typed input. Fast, because a viewer does not want
 *  to watch someone type — but not instant, because instant is not typing. */
export const TYPE_CPS = 22;
export const typeFor = (chars: number): number =>
  Math.max(sec(0.3), Math.round((chars / TYPE_CPS) * FPS));

/** A swipe or a scroll: the gesture itself, not the settle after it. */
export const SWIPE = sec(0.42);

/* ── the camera ─────────────────────────────────────────────────── */

/**
 * A push-in says "look here". It is the only camera move in the vocabulary,
 * and it is slow on purpose: anything faster reads as a zoom effect rather
 * than as attention. A phone screen in a 9:16 frame is already large, so the
 * distance travelled is small.
 */
export const PUSH_IN = sec(1.4);
/** How much closer a push-in gets. 8% is enough to feel and not enough to see
 *  as scaling. */
export const PUSH_IN_AMOUNT = 0.08;

/* ── cuts ───────────────────────────────────────────────────────── */

/**
 * A cut lands on the beat, never mid-animation.
 *
 * The most common failure in generated video is cutting while something is
 * still easing, which reads as a dropped frame rather than as an edit. So a
 * shot always ends on a settled state, and this is the pause on that settled
 * state before the cut — short enough to keep pace, long enough that the eye
 * registers the screen as finished.
 */
export const SETTLE_BEFORE_CUT = sec(0.22);

/** Crossfade length. Deliberately tiny: this is a cut with the edge taken off,
 *  not a dissolve. Dissolves between UI screens read as a slideshow. */
export const CUT_BLEND = sec(0.08);

/* ── the whole thing ────────────────────────────────────────────── */

/**
 * Target length for one feature video.
 *
 * The existing explainer prompts say "THIRTEEN-second" and the renderer
 * produced 20.3s, which is the kind of drift that happens when the number
 * lives in prose. It lives here now.
 *
 * Fifteen seconds is the working answer: long enough for three screens with
 * real holds, short enough to survive a feed. TARGET is what to aim at and MAX
 * is where a script gets cut down rather than shipped long.
 */
export const TARGET = sec(15);
export const MAX = sec(22);

/** Frame 0 is the grid thumbnail on both Instagram and TikTok, so nothing may
 *  animate in from nothing: the first shot opens already composed. This is how
 *  many frames at the head are treated as the poster. */
export const POSTER_HEAD = sec(0.4);
