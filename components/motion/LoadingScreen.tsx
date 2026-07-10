"use client";

import { useEffect, useState } from "react";

/**
 * LoadingScreen — full-viewport branded loader with progress bar and
 * percentage. Fades out and unmounts when `progress` reaches 1.
 *
 * Pattern extracted from a luxury automotive scroll hero that loads a
 * GLTF model. Use whenever a hero waits on significant async resources:
 *   - GLTF / GLB model load
 *   - Video preload
 *   - Font swap
 *   - Any scroll-3D archetype (Archetype E or planned H)
 *
 * Usage:
 *   const [progress, setProgress] = useState(0);
 *   const [done, setDone] = useState(false);
 *
 *   useEffect(() => {
 *     // Your loader calls setProgress(n) as resources load
 *     // When fully loaded:
 *     setProgress(1);
 *     setTimeout(() => setDone(true), 400);
 *   }, []);
 *
 *   return (
 *     <>
 *       {!done && <LoadingScreen brand="TURBO 930" progress={progress} />}
 *       <YourHero />
 *     </>
 *   );
 *
 * When `progress === 1`, LoadingScreen fades out over 800ms. Parent
 * should unmount after the fade (set `done = true` via setTimeout).
 */
type Props = {
  brand: string;                 // e.g. "TURBO 930" or "HOROLOG"
  progress: number;              // 0–1
  accentColor?: string;          // default gold
  bgColor?: string;              // default near-black
};

export default function LoadingScreen({
  brand,
  progress,
  accentColor = "#d4a24c",
  bgColor = "#0a0b0f",
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const pct = Math.round(clamped * 100);
  const isDone = clamped >= 1;

  // Fade out when done
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => setFaded(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isDone]);

  return (
    <div
      aria-hidden={isDone}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[800ms] ease-out"
      style={{
        background: bgColor,
        opacity: faded ? 0 : 1,
        pointerEvents: faded ? "none" : "auto",
      }}
    >
      <div
        className="font-display font-extrabold uppercase"
        style={{
          fontSize: 18,
          letterSpacing: "0.18em",
          color: "#f5f1e8",
        }}
      >
        {brand}
      </div>

      <div
        className="mt-6 overflow-hidden rounded-[1px]"
        style={{ width: 200, height: 2, background: "rgba(245,241,232,0.12)" }}
      >
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: accentColor,
          }}
        />
      </div>

      <div
        className="mt-2.5 font-mono"
        style={{
          fontSize: 11,
          color: "rgba(245,241,232,0.4)",
          letterSpacing: "0.08em",
        }}
      >
        {pct}%
      </div>
    </div>
  );
}
