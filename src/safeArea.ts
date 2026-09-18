// The parts of the frame the platform covers up.
//
// A 1080x1920 video is not 1080x1920 of usable picture. Instagram and TikTok
// both paint their own interface over the bottom and the right — username,
// caption, the like/comment/share rail — and anything the edit puts there is
// either hidden or fighting for the same pixels.
//
// This is the least glamorous file in the grammar and probably the one that
// saves the most work. It is invisible in a preview and obvious in a feed,
// which is the worst combination available: nobody catches it until it has
// shipped, and then every video has it.
//
// Numbers are the UNION of both platforms, measured against a 1080x1920 frame,
// deliberately generous. Losing 60px of margin costs nothing; losing the last
// word of a caption costs the post.

/** Authored against this frame; scaled proportionally for any other. */
export const REF_W = 1080;
export const REF_H = 1920;

export const SAFE = {
  /** IG's header and TikTok's top gradient both live up here. */
  top: 150,
  /** The big one. TikTok's caption block and IG's username, caption and audio
   *  row. Anything below this line is decoration at best. */
  bottom: 360,
  /** The action rail — like, comment, share, profile — on the right on both. */
  right: 190,
  /** Nothing covers the left, but a caption that runs to the edge reads as a
   *  mistake regardless of what is over it. */
  left: 64,
} as const;

/** The rectangle an edit may actually use, as fractions of the frame, so it
 *  survives any composition size. */
export const safeBox = (w = REF_W, h = REF_H) => ({
  left: (SAFE.left / REF_W) * w,
  right: w - (SAFE.right / REF_W) * w,
  top: (SAFE.top / REF_H) * h,
  bottom: h - (SAFE.bottom / REF_H) * h,
  get width() {
    return this.right - this.left;
  },
  get height() {
    return this.bottom - this.top;
  },
});

/**
 * Where a caption sits: on the floor of the safe box, not the floor of the
 * frame.
 *
 * Captions go low because the subject is above them and because a viewer's eye
 * is already at the bottom of a feed video. They do not go lower than this,
 * however much room appears to be left, because that room belongs to TikTok.
 */
export const CAPTION_BASELINE = REF_H - SAFE.bottom;
