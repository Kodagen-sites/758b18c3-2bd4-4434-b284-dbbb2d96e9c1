"use client";

import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";

/**
 * The most-used primitive: fade-in + subtle upward translate on scroll into view.
 * Don't overuse — apply to 4-6 elements per page MAX. More than that feels
 * janky and AI-generated.
 *
 * Best applied to:
 *   - Section headings
 *   - The first card in a grid (then stagger the rest with a custom delay)
 *   - Pullquotes / manifesto text
 *   - CTA blocks at the bottom of sections
 *
 * Usage:
 *   <FadeUp><h2>Section title</h2></FadeUp>
 *   <FadeUp delay={0.2}>...</FadeUp>
 *   <FadeUp distance={60} duration={0.9}>...</FadeUp>
 */
type Props = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  once?: boolean;
};

export default function FadeUp({
  children,
  delay = 0,
  duration = 0.7,
  distance = 30,
  className = "",
  once = true,
}: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: distance }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrap a list of children so each fades up with stagger.
 * Great for service card grids, testimonial rows, team members.
 *
 * Usage:
 *   <StaggerChildren staggerDelay={0.08}>
 *     {items.map(item => <Card key={item.id} {...item} />)}
 *   </StaggerChildren>
 */
type StaggerProps = {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  distance?: number;
  className?: string;
};

export function StaggerChildren({
  children,
  staggerDelay = 0.08,
  initialDelay = 0,
  distance = 30,
  className = "",
}: StaggerProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <FadeUp
          key={i}
          delay={initialDelay + i * staggerDelay}
          distance={distance}
        >
          {child}
        </FadeUp>
      ))}
    </div>
  );
}
