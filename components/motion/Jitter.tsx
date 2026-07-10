"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Jitter — wraps any element in a micro-shake animation. Can be
 * ambient (always jittering — use sparingly on one accent element)
 * or hover-triggered (kicks in only on pointer-enter).
 *
 * The jitter uses a 6-keyframe x/y translation loop at the chosen
 * intensity and speed. Not rotation-based — rotation jitters feel
 * cheap; translation jitters feel like "electricity".
 *
 * Usage:
 *   // hover trigger — most common
 *   <Jitter>
 *     <span>Hovering jitters me</span>
 *   </Jitter>
 *
 *   // ambient — ONE per page, as a living accent
 *   <Jitter trigger="ambient" intensity={0.8} speed="slow">
 *     <span className="text-primary">[ live ]</span>
 *   </Jitter>
 *
 *   // on a CTA
 *   <Jitter intensity={1.2} speed="fast">
 *     <MagneticButton as="a" href="/contact">Start</MagneticButton>
 *   </Jitter>
 *
 * Pairs well with: neon/retro brands (S1/S5 CV5 CRT cards), brutalist
 * (CV6), technical-playful personalities. Avoid on premium/luxury
 * (S2/S11) — jitter reads as noise, not polish.
 */
type Props = {
  children: ReactNode;
  intensity?: number;            // pixels of jitter (default 1.5)
  trigger?: "ambient" | "hover";
  speed?: "slow" | "medium" | "fast";
  className?: string;
  as?: "div" | "span";
};

const SPEED_MAP = {
  slow: 0.6,
  medium: 0.35,
  fast: 0.18,
};

export default function Jitter({
  children,
  intensity = 1.5,
  trigger = "hover",
  speed = "medium",
  className = "",
  as = "div",
}: Props) {
  // Keyframe array — micro-shake path. Not random at runtime (would break
  // memoization); fixed sequence that reads as random at this amplitude.
  const i = intensity;
  const xs = [0, i, -i, 0.6 * i, -0.5 * i, 0.3 * i, 0];
  const ys = [0, -0.4 * i, i, -i, 0.5 * i, -0.3 * i, 0];
  const duration = SPEED_MAP[speed];

  const baseTransition = {
    duration,
    repeat: Infinity,
    ease: "linear" as const,
  };

  const Comp = as === "span" ? motion.span : motion.div;

  if (trigger === "ambient") {
    return (
      <Comp
        className={`inline-block ${className}`}
        animate={{ x: xs, y: ys }}
        transition={baseTransition}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      className={`inline-block ${className}`}
      whileHover={{
        x: xs,
        y: ys,
        transition: baseTransition,
      }}
    >
      {children}
    </Comp>
  );
}
