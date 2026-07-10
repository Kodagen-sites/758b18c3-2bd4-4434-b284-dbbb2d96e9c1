"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Thin bar pinned to the top of the viewport showing how far the user has
 * scrolled through the page. Subtle but signals "this site has attention
 * to detail".
 *
 * Mount once in App.tsx or at the top of a long page.
 *
 * Usage:
 *   <ScrollProgress />
 *   <ScrollProgress color="var(--accent-color)" thickness={3} />
 */
type Props = {
  color?: string;
  thickness?: number;
  zIndex?: number;
};

export default function ScrollProgress({
  color = "var(--primary-color)",
  thickness = 2,
  zIndex = 50,
}: Props) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 origin-left"
      style={{
        scaleX,
        height: thickness,
        background: color,
        zIndex,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
  );
}
