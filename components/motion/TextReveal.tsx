"use client";

import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";

/**
 * Reveals text word-by-word with stagger when it scrolls into view.
 * Used for hero H1s, section headings, manifesto pullquotes.
 *
 * Usage:
 *   <TextReveal>Your headline here</TextReveal>
 *   <TextReveal as="h2" delay={0.2}>Our approach</TextReveal>
 */
type Props = {
  children: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
};

export default function TextReveal({
  children,
  as = "h2",
  className = "",
  delay = 0,
  stagger = 0.03,
  once = true,
}: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-10% 0px -10% 0px" });
  const words = children.split(" ");

  const Tag = motion[as] as any;

  return (
    <Tag ref={ref} className={className} aria-label={children}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ y: 24, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
          transition={{
            duration: 0.7,
            delay: delay + i * stagger,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}
