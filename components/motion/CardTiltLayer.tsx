"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, MouseEvent, useRef } from "react";

/**
 * Card wrapper that tilts slightly based on cursor position on hover.
 * Creates a subtle 3D depth effect. Used for service cards, case studies.
 *
 * Internally, content lifts slightly (translateZ) so it appears to hover
 * above the card surface. Matches sites like linear.app, vercel.com.
 */
type Props = {
  children: ReactNode;
  className?: string;
  intensity?: number; // 0-1, default 0.3
  lift?: number;      // px, how much content lifts, default 10
};

export default function CardTiltLayer({
  children,
  className = "",
  intensity = 0.3,
  lift = 10,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8 * intensity, -8 * intensity]), {
    stiffness: 200, damping: 25,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8 * intensity, 8 * intensity]), {
    stiffness: 200, damping: 25,
  });

  const handleMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(mx);
    y.set(my);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        perspective: 800,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      <div style={{ transform: `translateZ(${lift}px)` }}>
        {children}
      </div>
    </motion.div>
  );
}
