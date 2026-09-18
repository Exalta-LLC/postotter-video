import React from "react";
import { defineSurface, type SurfaceProps } from "@postotter/video";
// Import YOUR components. They already know what your product looks like.
// import { Card, CardContent } from "@/components/ui/card";

interface Data {
  title: string;
}

/**
 * A SURFACE is one screen of your product, rebuilt for film.
 *
 * The one rule: it is a pure function of (state, data). No useCurrentFrame, no
 * interpolate, no spring, no frame numbers. It knows how to look right in each
 * of its states; the grammar decides when they happen.
 *
 * Author it at 393x852 — a real phone — so your own type scale and padding are
 * the size they are on a handset.
 */
const Body: React.FC<SurfaceProps<Data>> = ({ state, data }) => (
  <div className="absolute inset-0 bg-background flex flex-col p-5">
    <h1 className="text-xl font-semibold text-foreground">{data.title}</h1>
    {state === "done" ? (
      <p className="mt-2 text-sm text-primary">Something changed.</p>
    ) : (
      <p className="mt-2 text-sm text-muted-foreground">Nothing has happened yet.</p>
    )}
  </div>
);

export const example = defineSurface<Data>({
  id: "example",
  // One plain sentence. The copy model reads this to decide what the post says.
  describes: "replace me with what this screen is actually for",
  // The first state is the resting state: what frame 0 draws, and what both
  // platforms use as the grid thumbnail.
  states: ["idle", "done"],
  // Where a finger can land, in the 393x852 viewport. Measure these off a
  // render — guessing puts the tap on empty space.
  targets: { thing: { x: 196, y: 400 } },
  // How YOUR app moves between states, read off your CSS or Tailwind config.
  // motion: { ms: 350, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
  component: Body,
});
