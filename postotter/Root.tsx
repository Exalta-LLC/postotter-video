import React from "react";
import { Composition } from "remotion";
import { planFilm } from "@postotter/video";
import { MyFilm, TAKES } from "./film";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MyFilm"
    component={MyFilm}
    fps={30}
    width={1080}
    height={1920}
    // Length comes from the beats, so the video is as long as it needs to be
    // and never longer.
    durationInFrames={planFilm(TAKES).total}
  />
);
