---
name: postotter-surfaces
description: Turn a product's repo into a library of filmable screens — surfaces the PostOtter grammar can drive into social video. Use when asked to make video or social content about a product whose code is available, to add a screen to an existing surface library, or when running `npx postotter init`.
---

# Build a surface library from this repo

You are going to make this product filmable.

A **surface** is one screen of it, rebuilt so it can be driven by an edit: their
UI, their tokens, plausible data, a handful of named states. You write the
surfaces. Something else supplies the timing, the camera, the cuts and the
captions — you never write any of those, and the contract below is mostly about
staying out of their way.

Do the work in this order. Step 1 is the one people skip and it is the one that
saves the most time.

---

## 1. Find what the repo already knows how to do

Before writing anything, look for work that has already been done here:

- **Existing video compositions** — `apps/video`, `remotion/`, anything importing
  `remotion`. If they exist, read them. They are this product's own idea of what
  it looks like on film, and they beat anything you would invent.
- **Login and screenshot automation** — `.claude/scripts/`, `e2e/`, `*.spec.ts`,
  a `playwright.config.ts`. A repo where someone has been iterating with an agent
  very often has scripts that log in as each role and capture screens. They are a
  map of which screens matter and how to reach them.
- **Seed and fixture data** — whatever the tests or the seeds use. It is already
  shaped correctly and somebody already made it presentable.

Reuse beats rebuild every time. If there is a composition for a screen, adapt it
to the contract rather than starting again.

## 2. Find the screens worth filming

Three places, and the third is the one that gets missed.

**Routes.** The router, the pages directory. This is the obvious list.

**Flow components.** Multi-step journeys often live outside the router entirely —
a directory of screens driven by a state machine. These are usually the *best*
material, because they are the product actually doing its job.

**Data.** Constants, enums, seed files, i18n strings. This is where the specific,
concrete, filmable material hides. A list of options a user picks from is a
screen waiting to happen, and nobody ever thinks to look there.

> One health product kept sixty real, specific, human conditions in a
> `constants/` file — the most filmable material it had. Its repo also held five
> hand-built video compositions, and not one of them was about those conditions.
> The material was one directory away from the components the whole time.

**Read contents, never filenames.** A file called `…Placeholder.tsx` in that
same repo was a complete, shipped feature — dashboard, bookings, claim status. An
agent that trusted the name would have reported it unbuilt.

## 3. Author the whole PAGE — chrome included

A surface is everything a user sees when they land on that route. Not a
component, and not just the content region either.

This lesson cost four attempts, each one closer and still short:

1. The bare component — a search box on a background. Filled a third of a phone.
2. Its real container — a bottom sheet over a full-bleed map. Better, and still
   missing everything around it.
3. The page chrome — **but only the chrome the screen actually has.** Find the
   shell components (`components/layout/`, `AppShell`, `TopBar`, `BottomNav`),
   then **check what imports them**. one product has a `ScreenShell.tsx` with a TopBar
   and a step indicator, and nothing in the app uses it — grep says its only
   importers are its own barrel file and itself. An earlier pass put that shell
   on two surfaces and invented a stepper the flow does not have, overlapping a
   heading that really sits at the top of the page. **Dead chrome is worse than
   missing chrome**, because missing chrome looks empty and invented chrome looks
   like a different product.
4. The state of the chrome. The action button is *disabled* until something is
   chosen, and that is the most honest thing on the screen — it is the product
   telling the user what to do next.

**Before writing a surface, ask what the user would see above and below the
thing you are building.** Header, nav, tabs, progress, the primary button. If
the answer is "nothing", check again — it is almost never nothing.

## 3b. Use their stylesheet, not your reading of it

Do not translate their design into inline styles. **Compile their real CSS and
write the surface in their own class names, copied out of their JSX.**

```bash
npx tailwindcss -c tailwind.config.ts -i src/index.css -o brand.css
```

A mid-size app's came to 79KB: every utility it uses, its tokens, radii,
shadows and keyframes. Load it, and a class list lifted verbatim out of a
component renders exactly as it does in the product. A hand-converted `#16A249` is a copy that
drifts the day they change anything, and it throws away everything their design
system already knows.

**Author at the phone's real size.** A `text-base` is 16px because the app
runs on a ~390px screen; the same class in a 1080px box renders as a caption.
`Device` gives a surface a **393×852** viewport and scales the whole viewport, so
type scale, padding, radius and tap targets are all the size they are on a
handset.

**Import their components.** You are writing inside their repo, so
`import { Card } from "@/components/ui/card"` and `import { Button } from
"@/components/ui/button"` simply work. Use them. A Card you rebuilt by class
name is right until their design system changes and then it is quietly wrong —
and their Button already knows what disabled looks like, which is a decision you
should not be making on their behalf.

**Load their font.** Find the `<link>` in their `index.html` or the `@font-face`
in their CSS and pass it to `Film`. A render without it falls back to a system
face and every word is subtly the wrong shape — the one difference a designer
spots instantly and nobody else can name. It has to be *loaded*, not requested:
the grammar holds the render until `document.fonts` is ready, because a webfont
still in flight renders as the fallback and ships in the wrong typeface.

Between them, these four are the difference between a video that uses the
customer's colours and one that looks like their app. Not Tailwind? Chakra, MUI
and vanilla-extract all have a stylesheet or a theme object you can load the same
way. Take the real thing; never retype it.

Only when there is genuinely nothing to load do you read tokens by hand — and
then, never guess a colour that is written down somewhere.

**Find the theme properly before concluding there isn't one.** It is as often a
directory as a file — `lib/theme/index.ts`, `styles/theme/`, `theme/colors.ts` —
so search for `extendTheme`, `createTheme`, `:root`, `@theme` or the config's
own name, not for a filename.

**And trust the theme over the component.** A screen written before the tokens
existed will carry raw hex or a framework default that is nothing like the
brand. One app's modal is written in a framework default `colorScheme`; the brand is
nothing like it, and its theme file says so in a comment explaining that the UI
once carried five different greens across 200 sites. A surface copied faithfully from that
component comes out blue, and ships a bug into the customer's marketing. Where
the theme and a component disagree, the theme wins — and it is worth telling the
customer they disagree.

## 4. The contract

```tsx
import { defineSurface, type SurfaceProps } from "@postotter/film-grammar";

export const symptomSearch = defineSurface<SymptomSearchData>({
  id: "symptom-search",
  describes: "the symptom search a patient starts a visit with",
  states: ["idle", "typing", "suggesting", "chosen"],
  targets: { field: { x: 0.5, y: 0.68 }, firstSuggestion: { x: 0.5, y: 0.78 } },
  component: SymptomSearchBody,
});
```

**A surface is a pure function of `(state, data)`.** It knows how to look right
in each of its states. That is all it knows.

**It must not import or call any of these:** `useCurrentFrame`, `interpolate`,
`spring`, `Easing`, `useVideoConfig`, or any frame number. If you find yourself
writing `frame >= 84`, stop — you are writing the edit, and the edit is not
yours. A surface that times itself is welded to one shot and fights every other
shot it is ever placed in.

**`states`** — the real states of that screen, named in the product's own words.
The **first one is the resting state**: it is what frame 0 draws, and frame 0 is
the grid thumbnail on Instagram and TikTok both.

**`targets`** — where a finger can land, in the surface's own **393×852 viewport
pixels**. Name them for what they are (`accept`, `field`, `firstSuggestion`), not
where they are.

**Measure them off a render; do not guess.** The first attempt used eyeballed
fractions and both taps landed on empty space — the ripple fired over blank
sheet while the UI changed by itself, which is the exact failure the touch
exists to prevent.

**And a target belongs to a state.** A bottom sheet grows when its suggestions open, so
everything above moves up: a field sits at y≈720 while the sheet is idle and the
first suggestion at y≈470 once the list has pushed the sheet tall. Give each target the position it has *in the state where it is tapped*.

**`motion`** — how the product moves between its own states, **read off its
code**. A duration and a curve: `{ ms: 350, easing: "cubic-bezier(0.32,0.72,0,1)" }`.
Look in the Tailwind config's `keyframes`/`animation`, CSS `transition`
declarations, framer-motion props, or a constants file — the product's sheet snap is a
`SPRING` const in `BottomSheet.tsx` and its entrance is `sheet-up` in
`tailwind.config.ts`.

This is the part that makes a video authentic rather than templated. An editor
working from a screen recording is stuck with whatever the app did; you are
rebuilding the app, so you can play its *real* transition. A generic fade in its
place is a video tool signing its name on someone else's product. Declaring the
curve is not choreographing — you say how the app moves, the grammar says when.

**`describes`** — one plain sentence about what this screen is for. The copy
engine reads it when deciding what a post is about. Write it for a person.

## 5. Write data that looks like a real account

Take the shapes from their TypeScript types, then fill them like someone who
uses the product.

Real names, plausible prices in the currency the product actually uses, times
that make sense, lists long enough to look used. A screen full of `test test`,
`asdf` and `user@example.com` looks like a broken product — **worse than no video
at all**, because it ships under the customer's own brand.

Never real customer data. You are writing fiction shaped by their types, and you
should never need a database, a login or a running server to do it.

## 6. Some products need a lighter hand

If the product touches health, money, legal status, employment or anything else
where being wrong hurts someone, the surface and its data carry that weight too.

- **Never stage a result that implies a diagnosis, a verdict or a guarantee**,
  even a favourable one. Show the product working, not an outcome being decided.
- **Do not play distress for effect.** A severe score, a rejected application or
  a frightening number is not b-roll. Pick the mild case; the product is the
  subject, not somebody's bad day.
- **Keep the product's own hedges in frame.** If a screen says "not a diagnosis"
  or "estimate only", that line belongs in the surface. Cropping it out is
  editing away a disclaimer.

> A mental-health product's own screening tool says, in its own UI, that it
> "should not replace professional evaluation". The surface built from it lands
> on the mildest result, keeps that sentence on screen, and gives the last word
> to what happens next rather than to a number.

## 7. Check it before you hand it over

- `validateShot(surface, beats)` returns `[]` — a tap at an undeclared target or
  a transition to a state the surface cannot draw fails silently otherwise: the
  finger just does not appear and the UI changes on its own, which is exactly the
  thing the hand exists to prevent.
- Render one still per state and **look at it**. Every composition problem found
  so far has been invisible in the code and obvious in a frame.
- A phone frame that is half empty means you built a widget. Go back to step 3.
- **No header and no button almost always means you missed the shell.** Open the
  route and list what wraps it before deciding there is nothing there — and
  `grep` for who imports a shell before you use it.
- **A `type` beat needs `into`.** Without it the field shows its final value from
  frame one and there is no typing at all, which looks like the text was always
  there. Name the data key the characters land in.

---

## What good looks like

A stranger scrolling past should recognise the product, and someone who uses it
should think "that is our app". Not a template with their colours applied — the
screens they actually see, doing the thing the product is for.

The test: **could this video exist for any other company?** If yes, it is not a
surface library, it is a theme.

## Reference

- `reference/contract.md` — the full API, and what the grammar does with it
- `reference/worked-example.md` — a real screen, from repo to surface
