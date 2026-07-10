"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, motion } from "framer-motion";

/**
 * Counts up from 0 to the target number when scrolled into view.
 * Used in stats sections ("4.5 stars · 600+ reviews", "12 years in business", etc.).
 *
 * Usage:
 *   <NumberCounter to={624} suffix="+" />
 *   <NumberCounter to={4.5} decimals={1} />
 *   <NumberCounter to={99} prefix="$" suffix="M" />
 */
type Props = {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatThousands?: boolean;
};

export default function NumberCounter({
  to,
  from = 0,
  duration = 1.4,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  formatThousands = false,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, from, duration]);

  const formatted = (() => {
    const v = value.toFixed(decimals);
    if (!formatThousands) return v;
    const [int, dec] = v.split(".");
    const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return dec ? `${withCommas}.${dec}` : withCommas;
  })();

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      {formatted}
      {suffix}
    </motion.span>
  );
}
