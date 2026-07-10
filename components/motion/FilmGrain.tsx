"use client";

import { CSSProperties } from "react";

/**
 * FilmGrain — full-viewport animated noise overlay via a CSS-keyframe
 * driven SVG turbulence texture. Gives the "shot on film" feel with
 * near-zero CPU cost (vs. canvas-based per-frame noise generation).
 *
 * The approach: embed an SVG <feTurbulence> noise pattern as a data-URL
 * background image, then animate its `transform` via CSS keyframes so
 * the texture shifts position every step — reads as dynamic grain
 * without regenerating pixels.
 *
 * Pattern extracted from a luxury automotive showcase hero — same
 * technique used on production creative-studio sites.
 *
 * Mount once in App.tsx outside <Routes>:
 *   <FilmGrain />                  // subtle default (0.035)
 *   <FilmGrain opacity={0.06} />   // retro/gritty
 */
type Props = {
  opacity?: number;
  blendMode?: CSSProperties["mixBlendMode"];
  baseFrequency?: number;   // SVG turbulence freq (0.7 = coarse, 1.2 = fine)
  speed?: "slow" | "medium" | "fast";
};

const SPEED_MAP = {
  slow: "0.8s",
  medium: "0.5s",
  fast: "0.3s",
};

// SVG turbulence data-URL — stable noise that we'll shift via CSS animation
const grainSvg = (freq: number) =>
  `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function FilmGrain({
  opacity = 0.035,
  blendMode = "overlay",
  baseFrequency = 0.9,
  speed = "medium",
}: Props) {
  const duration = SPEED_MAP[speed];
  const animName = `filmGrain_${baseFrequency.toString().replace(".", "_")}`;

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0%,100% { transform: translate(0,0); }
          10%  { transform: translate(-5%,-10%); }
          30%  { transform: translate(3%,-15%); }
          50%  { transform: translate(12%,9%); }
          70%  { transform: translate(9%,4%); }
          90%  { transform: translate(-1%,7%); }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 9998,
          opacity,
          mixBlendMode: blendMode,
          backgroundImage: grainSvg(baseFrequency),
          animation: `${animName} ${duration} steps(6) infinite`,
          willChange: "transform",
        }}
      />
    </>
  );
}
