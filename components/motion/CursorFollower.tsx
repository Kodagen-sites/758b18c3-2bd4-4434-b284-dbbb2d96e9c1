"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Custom cursor that follows mouse, morphs on interactive elements.
 * Disabled on touch devices (where there's no cursor).
 *
 * To make an element "grab" the cursor (grow it, show a label), add
 * data-cursor-label="View project" to any element.
 *
 * Mount once in App.tsx.
 */
export default function CursorFollower() {
  const [mounted, setMounted] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 30, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 500, damping: 30, mass: 0.2 });

  useEffect(() => {
    // Don't render on touch/coarse-pointer devices
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setMounted(true);

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const labeled = target.closest("[data-cursor-label]") as HTMLElement | null;
      const interactive = target.closest("a, button, [role='button'], input, textarea");
      if (labeled) {
        setLabel(labeled.dataset.cursorLabel || "");
        setHovering(true);
      } else if (interactive) {
        setLabel(null);
        setHovering(true);
      } else {
        setLabel(null);
        setHovering(false);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, [x, y]);

  if (!mounted) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:flex items-center justify-center"
      style={{
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
        mixBlendMode: "difference",
      }}
    >
      <motion.div
        animate={{
          width: label ? "auto" : hovering ? 36 : 10,
          height: label ? "auto" : hovering ? 36 : 10,
          padding: label ? "6px 14px" : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="rounded-full bg-white flex items-center justify-center"
      >
        {label && (
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-black whitespace-nowrap">
            {label}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
