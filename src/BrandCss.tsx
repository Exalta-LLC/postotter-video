// Their stylesheet and their typeface, not our approximation of either.
//
// Until now a surface converted the customer's tokens into inline styles by
// hand — `--primary: 142 76% 36%` became `#16A249` in a const. That works and
// it is a copy, which means it drifts the moment they change anything, and it
// throws away every utility, radius, shadow and animation their design system
// already defines.
//
// A Tailwind product can just hand us the real thing:
//
//   npx tailwindcss -c their.config -i their/index.css -o brand.css
//
// ~79KB for a mid-size app: every class it actually uses, its tokens, its
// keyframes. Load it and a surface can be written in their OWN class names,
// copied from their JSX, rather than translated.
//
// ── the font ────────────────────────────────────────────────────────
//
// The last visible gap. An app's index.html links its typeface from a CDN, so a
// render without it falls back to a system face and every word is subtly the
// wrong shape — the one difference a designer would notice immediately and
// nobody else could name.
//
// It has to be LOADED, not merely requested: Remotion screenshots frames as
// fast as Chrome will draw them, so a webfont still in flight renders as the
// fallback and the video ships in the wrong typeface. delayRender holds the
// render until document.fonts says it is ready.

import React from "react";
import { continueRender, delayRender } from "remotion";

export const BrandCss: React.FC<{ css: string; fontUrl?: string }> = ({
  css,
  fontUrl,
}) => {
  const [handle] = React.useState(() =>
    fontUrl ? delayRender("loading the brand's typeface") : null
  );

  React.useEffect(() => {
    if (!fontUrl || handle === null) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
    // Belt and braces: a font that never arrives must not hang the render for
    // ever, so the wait is capped and the fallback ships rather than nothing.
    const done = () => continueRender(handle);
    const timer = setTimeout(done, 8000);
    document.fonts.ready.then(() => {
      clearTimeout(timer);
      done();
    });
    return () => clearTimeout(timer);
  }, [fontUrl, handle]);

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
