// What the copy model is told, and what it is deliberately not told.
//
// The shoot is already planned when this runs: the surfaces are chosen, the
// beats are laid out, the length is checked. So the model has exactly one job —
// write the words over each shot — and everything it might use as an excuse to
// do something else is withheld.
//
// ── what it does not see ────────────────────────────────────────────
//
// Not the beats, not the frame counts, not the target length. A caption written
// against a runtime comes out as a runtime — a model told the video is fifteen
// seconds long will tell the viewer so. It sees a word budget instead, which is
// the same constraint expressed as a thing a writer can use.
//
// Even the forbidding has to be careful: an earlier draft of rule 4 banned the
// phrase "in 15 seconds", which of course told the model the video is fifteen
// seconds long. A test catches that now, and caught exactly that.
//
// ── what it does see ────────────────────────────────────────────────
//
// The surface's own `describes` sentence and the states the shot passes
// through. That is the difference between a caption about the product and a
// caption about what is on screen — and only the second one is worth reading
// while the screen is there to be looked at.

import type { CaptionBrief } from "./shoot";

export interface CopyContext {
  productName: string;
  /** What the product does, from the brand profile. */
  description: string;
  /** The opening shape for this day, from the existing hook rotation. */
  hook: string;
  /** Today's ask, from the brand's own nextSteps. */
  nextStep?: string | null;
}

export function captionPrompt(ctx: CopyContext, briefs: CaptionBrief[]): string {
  return `You are writing the on-screen captions for a short vertical video about ${ctx.productName}.

THE PRODUCT
${ctx.description}

WHAT THE VIEWER IS LOOKING AT. Each shot is a real screen of the product, being used. One caption per shot, in order:

${briefs
  .map(
    (b, i) =>
      `${i + 1}. ${b.describes}\n   It moves through: ${b.states.join(" → ")}\n   Budget: about ${b.words} words.`
  )
  .join("\n\n")}

RULES

1. SAY WHAT IS ON SCREEN, not what the product is. The screen is right there being looked at; a caption that describes the company while the viewer watches a form being filled in is competing with its own picture and losing. "Doctors near you send a price" beats "The smarter way to see a doctor".

2. THE FIRST CAPTION MUST ${ctx.hook}

3. Ground every word in the material above. Never invent a number, a customer, a result, a price, a rating, an award or a capability. If the screens do not show it, it does not go in the caption.

4. Plain sentences a person would say. No emoji, no hashtags, no ALL CAPS, no exclamation marks. Never name the medium: no "watch", no "swipe up", no "POV", and never state how long anything takes to watch.

5. Each caption stands alone. They are read one at a time, seconds apart, and the viewer has not memorised the previous one.

6. Stay near the word budget. Over it is allowed when the sentence genuinely needs it; double it is not, because the shot stretches to fit and the video becomes a slideshow.
${
  ctx.nextStep
    ? `
7. THE LAST CAPTION IS THE ASK, and today it asks for this and nothing else: "${ctx.nextStep}". Phrase it in your own words if that reads better; do not widen it, do not stack a second ask beside it.`
    : ""
}

Return ONLY valid JSON: { "captions": [${briefs.map((_, i) => `"caption ${i + 1}"`).join(", ")}] }`;
}
