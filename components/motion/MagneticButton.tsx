"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, MouseEvent, useRef } from "react";

/**
 * Button that subtly pulls toward the cursor on hover.
 * Works for both <button> and <a>. Used for hero CTAs.
 *
 * Pro-tip: keep strength ≤ 0.3 or it feels cartoonish.
 */
type Props = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  as?: "button" | "a";
  className?: string;
  strength?: number;
  ariaLabel?: string;
};

export default function MagneticButton({
  children,
  onClick,
  href,
  as = "button",
  className = "",
  strength = 0.25,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 180, damping: 15, mass: 0.3 });

  const handleMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Union of motion.a | motion.button: TS rejects shared props like `href`
  // (valid on <a>, not <button>) on the union. Cast to keep the cp'd template
  // build-clean — the runtime guard on `as` keeps the markup valid.
  const Component: any = as === "a" ? motion.a : motion.button;

  return (
    <Component
      ref={ref as any}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      href={href}
      aria-label={ariaLabel}
      style={{ x: sx, y: sy }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <motion.span className="inline-flex items-center" style={{ x: sx, y: sy }}>
        {children}
      </motion.span>
    </Component>
  );
}
