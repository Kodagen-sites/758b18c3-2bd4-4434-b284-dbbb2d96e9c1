"use client";

import { motion } from "framer-motion";
import { ReactNode, Children } from "react";

/**
 * Infinite horizontal-scrolling marquee.
 * Duplicates children so the loop is seamless.
 *
 * Used for: trust logos, service-chip tickers, testimonial rows,
 * "featured in" strips, horizontal case-study reels.
 *
 * Usage:
 *   <Marquee speed={40}>
 *     {logos.map(l => <img src={l.src} />)}
 *   </Marquee>
 */
type Props = {
  children: ReactNode;
  speed?: number;    // seconds for one full loop (higher = slower)
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  className?: string;
  gap?: string;      // tailwind-compatible, e.g. "gap-8"
};

export default function Marquee({
  children,
  speed = 30,
  direction = "left",
  pauseOnHover = false,
  className = "",
  gap = "gap-8",
}: Props) {
  const items = Children.toArray(children);

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <motion.div
        animate={{ x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
        className={`flex flex-nowrap ${gap}`}
        style={{ width: "max-content" }}
      >
        {/* Two copies of content = seamless infinite loop */}
        {[...items, ...items].map((child, i) => (
          <div key={i} className="flex-shrink-0">
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
