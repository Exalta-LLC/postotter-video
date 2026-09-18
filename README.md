# PostOtter Video

**Your app, as social video.**

Your coding agent already knows what your product looks like. This gives it the
other half: how to film it.

```bash
npx skills add Exalta-LLC/postotter-video
```

Then, in your repo:

> Make an Instagram post showing the symptom search.

Your agent reads your components, rebuilds the screen for film in your own CSS,
and this drives it — a finger landing on a real button, the state changing after
it the way real software does, a cut on the beat, a caption clear of TikTok's
chrome.

## Why it looks like your app and not like a template

Because the screens **are** your app. The agent writes them from your
components, your Tailwind config, your tokens, your fonts. This package never
picks a colour, a typeface, a radius or a layout.

What it does pick is the edit, and that is the part a repo cannot supply:

- **A tap is three events.** The pointer travels, it lands, and *then* the
  interface reacts. A state that flips on the same frame the finger arrives is a
  scripted animation, because it is one.
- **A shot ends settled.** A cut that lands mid-ease reads as a dropped frame,
  which is the commonest failure in generated video.
- **Holds follow the copy.** Cutting fast reads as energetic and means nobody
  learns what the product does.
- **Frame 0 is the grid thumbnail** on both Instagram and TikTok, so nothing
  opens mid-animation.
- **The bottom 360px belong to the platform.** Invisible in a preview, obvious
  in a feed.
- **Your transitions, not ours.** A surface declares the duration and curve its
  own UI uses, and the grammar plays that. Anyone editing a screen recording is
  stuck with whatever the app did; you are rebuilding it, so you can play the
  real thing.

## The contract

```tsx
import { defineSurface } from "postotter-video";
import { Card } from "@/components/ui/card";   // yours

export const proposals = defineSurface({
  id: "proposals",
  describes: "nearby doctors bidding for the visit, each with a price",
  states: ["waiting", "listed", "accepted"],
  targets: { second: { x: 196, y: 300 } },
  motion: { ms: 350, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  component: ({ state, data }) => /* your JSX, your classes */,
});
```

A surface is a pure function of `(state, data)`. It never reads the frame. It
knows four states and how to look right in each; the grammar decides when.

`SKILL.md` is the full authoring guide, and it is what your agent reads.

## What it does not do

It does not post anything. Rendering a video is the easy part of social; doing
it every day, on three platforms, at sensible times, is the rest — and that
needs OAuth relationships a package will never have. That is what
[PostOtter](https://postotter.app) does, and this works perfectly well without
it: the videos are yours, the code is MIT, and nothing here phones home.

No account, no key, no telemetry.
