import React from "react";
import { Film, type Take } from "@postotter/video";
import { example } from "./surfaces/example";

// One take per shot. The beats are the edit: hold, tap, type, swipe.
export const TAKES: Take<any>[] = [
  {
    surface: example,
    data: { title: "Your screen" },
    caption: "Say what is on screen, not what the product is",
    beats: [
      { kind: "hold", words: 5 },
      { kind: "tap", target: "thing", then: "done" },
      { kind: "hold", words: 5 },
    ],
  },
];

export const MyFilm: React.FC = () => (
  <Film
    takes={TAKES}
    ground="#EEF3F8"
    accent="#111111"
    // Your webfont, from your own index.html. Held until loaded, because a font
    // still in flight renders as the fallback.
    // fontUrl="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
  />
);
