"use client";

import { CSSProperties } from "react";

/**
 * Vignette — a fixed full-viewport radial-gradient overlay that darkens
 * the edges of the viewport. Cheap, effective premium touch.
 *
 * Pattern learned from the luxury-horology scroll hero: paired with
 * FilmGrain, this is what makes ordinary content read as "cinematic".
 *
 * Mount once in App.tsx outside <Routes>:
 *   <Vignette />
 *
 * Tune `strength` from 0.3 (subtle) to 0.85 (heavy). Default 0.7 is
 * the horology-hero tuning. Use `color` to match the brand bg — must be
 * the SAME as the page background or you'll see a color seam.
 */
type Props = {
  strength?: number;              // 0-1, corner darkness (default 0.7)
  innerStop?: number;             // % where the gradient starts (default 50)
  color?: string;                 // matches page bg, default navy like horology
  blendMode?: CSSProperties["mixBlendMode"];
};

export default function Vignette({
  strength = 0.7,
  innerStop = 50,
  color = "#050914",
  blendMode = "normal",
}: Props) {
  // Convert color to rgba for the gradient outer stop
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const outerColor = `rgba(${r},${g},${b},${strength})`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 9997,
        background: `radial-gradient(ellipse at center, transparent ${innerStop}%, ${outerColor} 100%)`,
        mixBlendMode: blendMode,
      }}
    />
  );
}
