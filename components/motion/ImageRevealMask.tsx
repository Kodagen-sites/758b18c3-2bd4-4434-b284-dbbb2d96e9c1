"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Reveals an image by unclipping it on scroll into view.
 * Much more premium than a fade — reads as "designed".
 *
 * Direction options:
 *   - bottom: reveals from top to bottom (default)
 *   - left: reveals from right to left
 *   - right: reveals from left to right
 *   - center: reveals from center outward
 *
 * Usage:
 *   <ImageRevealMask src="/section-2-mockup.jpg" alt="Platform overview" />
 *   <ImageRevealMask src="/hero.jpg" direction="center" duration={1.2} />
 */
type Props = {
  src: string;
  alt: string;
  className?: string;
  direction?: "bottom" | "left" | "right" | "center";
  duration?: number;
  delay?: number;
  aspectClass?: string; // e.g. "aspect-video", "aspect-[4/3]"
};

const clipMap = {
  bottom: { from: "inset(0 0 100% 0)", to: "inset(0 0 0 0)" },
  left:   { from: "inset(0 0 0 100%)", to: "inset(0 0 0 0)" },
  right:  { from: "inset(0 100% 0 0)", to: "inset(0 0 0 0)" },
  center: { from: "inset(50% 50% 50% 50%)", to: "inset(0 0 0 0)" },
};

export default function ImageRevealMask({
  src,
  alt,
  className = "",
  direction = "bottom",
  duration = 1.1,
  delay = 0,
  aspectClass = "aspect-[4/3]",
}: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const clips = clipMap[direction];

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden ${aspectClass} ${className}`}
      initial={{ clipPath: clips.from }}
      animate={inView ? { clipPath: clips.to } : undefined}
      transition={{
        duration,
        delay,
        ease: [0.76, 0, 0.24, 1],
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.15 }}
        animate={inView ? { scale: 1 } : undefined}
        transition={{ duration: duration * 1.2, delay, ease: "easeOut" }}
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
    </motion.div>
  );
}
