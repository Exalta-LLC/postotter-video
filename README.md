# PostOtter Video

**Your app, as social video.**

Your coding agent already knows what your product looks like. This gives it the
other half: how to film it.

```bash
npx @postotter/video init     # scaffolds a Remotion project, compiles your CSS
npx skills add Exalta-LLC/postotter-video   # teaches your agent to write surfaces
```

`init` finds your Tailwind config, compiles your real stylesheet, and writes a
film that already runs — so the gap between installing this and seeing a video
is one command rather than an afternoon of setup.

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
import { defineSurface } from "@postotter/video";
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

## A week, not a video

```
npx tsx postotter/week.ts
```

```
  A week of Scanly

    Sun 09-20   17.5s  share → scan
                tiktok, instagram, x
    Mon 09-21   17.5s  history → plan
                tiktok, instagram, x
    Tue 09-22   17.5s  share → results
                tiktok, instagram, x
    Wed 09-23   17.5s  plan → scan
                tiktok, x
    ...

    7 films, 19 posts
    reruns an earlier day: 09-24 — the library is too small for 7 days
```

Costs nothing and calls nothing — it is arithmetic over your surfaces and the
date. TikTok takes something every day, Instagram takes five and the five rotate,
and the draw is seeded on your brand so two products never run the same week and
a retry never produces a different video for a day you already posted.

The useful part is the warnings. A library that reruns itself is invisible from
inside any single day, and it is what makes an account look automated.

---

## What it does not do

It does not post anything. Rendering a video is the easy part of social; doing
it every day, on three platforms, at sensible times, is the rest — and that
needs OAuth relationships a package will never have. That is what
[PostOtter](https://postotter.app) does, and this works perfectly well without
it: the videos are yours, the code is MIT, and nothing here phones home.

No account, no key, no telemetry.
