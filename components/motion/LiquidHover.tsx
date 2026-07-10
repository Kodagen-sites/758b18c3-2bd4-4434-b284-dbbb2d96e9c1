"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useId, useState } from "react";

/**
 * LiquidHover — wraps any element in an SVG displacement filter that
 * activates on hover. Works over video, images, and text. The wrapped
 * content appears to warp like liquid when the cursor is inside.
 *
 * Key idea: we use SVG feTurbulence + feDisplacementMap as a CSS filter.
 * On hover, we animate the displacement scale from 0 → intensity.
 *
 * Usage:
 *   <LiquidHover intensity={20}>
 *     <img src="/hero.jpg" />
 *   </LiquidHover>
 *
 *   <LiquidHover intensity={12} speed="fast">
 *     <div className="text-6xl">Hover me</div>
 *   </LiquidHover>
 *
 * Works inside glass cards. Works over video (wrap the <video> element).
 * On mobile (no hover), renders content without the filter.
 */
type Props = {
  children: ReactNode;
  intensity?: number;         // max displacement scale on hover (default 15)
  speed?: "slow" | "medium" | "fast";   // turbulence animation speed
  className?: string;
};

const SPEED_MAP = {
  slow: "4s",
  medium: "2.5s",
  fast: "1.5s",
};

export default function LiquidHover({
  children,
  intensity = 15,
  speed = "medium",
  className = "",
}: Props) {
  // Unique filter id so multiple instances don't collide
  const id = useId().replace(/:/g, "");
  const filterId = `liquid-${id}`;
  const turbId = `turb-${id}`;

  const [hovered, setHovered] = useState(false);

  // Animate displacement scale smoothly
  const scale = useMotionValue(0);
  const smoothScale = useSpring(scale, { stiffness: 120, damping: 22 });

  return (
    <>
      {/* Hidden SVG containing the filter definition */}
      <svg
        className="absolute -z-10 w-0 h-0 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              id={turbId}
              type="fractalNoise"
              baseFrequency="0.015 0.018"
              numOctaves="2"
              seed="3"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur={SPEED_MAP[speed]}
                values="0.012 0.015; 0.020 0.022; 0.012 0.015"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <motion.feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              // motion's SVG-filter-primitive typing omits `scale`; cast with
              // `as any` to stay build-clean across framer-motion versions. (We
              // cast instead of using a ts-expect-error directive, which would
              // itself error as "unused" once the upstream type gap closes.)
              scale={smoothScale as any}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        className={`relative ${className}`}
        onMouseEnter={() => {
          setHovered(true);
          scale.set(intensity);
        }}
        onMouseLeave={() => {
          setHovered(false);
          scale.set(0);
        }}
        style={{
          filter: hovered ? `url(#${filterId})` : undefined,
          willChange: "filter",
        }}
      >
        {children}
      </div>
    </>
  );
}
