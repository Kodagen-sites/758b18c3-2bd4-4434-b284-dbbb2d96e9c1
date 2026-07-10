"use client";

import { useEffect, useRef, useState } from "react";

/**
 * TextScramble — cycles characters through random glyphs on hover
 * (or on scroll into view, if `trigger="view"`), then resolves to the
 * final text. Feels technical and premium when used on headings or CTAs.
 *
 * Usage:
 *   <TextScramble>Start a Project</TextScramble>
 *
 *   // On scroll into view instead of hover:
 *   <TextScramble trigger="view" as="h2" className="text-5xl">
 *     Our Process
 *   </TextScramble>
 *
 * Use sparingly — once per page max. Overuse reads as gimmick.
 */
type Props = {
  children: string;
  trigger?: "hover" | "view";
  duration?: number;            // total scramble duration in ms (default 600)
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  glyphs?: string;              // characters used for scramble (default: ASCII-safe set)
};

const DEFAULT_GLYPHS = "!<>-_\\/[]{}—=+*^?#________";

export default function TextScramble({
  children,
  trigger = "hover",
  duration = 600,
  as = "span",
  className = "",
  glyphs = DEFAULT_GLYPHS,
}: Props) {
  const [display, setDisplay] = useState(children);
  const ref = useRef<HTMLElement>(null);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const run = () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const targetText = children;
    const targetChars = targetText.split("");
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // fraction of characters settled
      const settled = Math.floor(targetChars.length * progress);

      const out = targetChars
        .map((ch, i) => {
          if (i < settled) return ch;                // already resolved
          if (ch === " ") return " ";                // keep spaces
          return glyphs[Math.floor(Math.random() * glyphs.length)];
        })
        .join("");

      setDisplay(out);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(targetText);
        runningRef.current = false;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    // Keep display in sync if the parent changes children text
    if (!runningRef.current) setDisplay(children);
  }, [children]);

  useEffect(() => {
    if (trigger !== "view") return;
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const Tag = as as any;

  return (
    <Tag
      ref={ref as any}
      className={className}
      aria-label={children}
      onMouseEnter={trigger === "hover" ? run : undefined}
    >
      {display}
    </Tag>
  );
}
