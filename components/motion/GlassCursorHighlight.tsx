"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { ReactNode, MouseEvent, useRef } from "react";

/**
 * GlassCursorHighlight — wraps a glass/blur card so a soft radial gradient
 * inside the card tracks the cursor. Creates the "aurora under glass" feel.
 *
 * Designed to be dropped inside an already-styled glass card (backdrop-blur,
 * rgba background, hairline border). This component adds the highlight layer
 * on top. Your content sits above the highlight — pass it as children.
 *
 * Usage:
 *   <div className="rounded-2xl backdrop-blur-xl bg-white/10 border border-white/15">
 *     <GlassCursorHighlight accent="#22d3ee">
 *       <div className="p-8">
 *         <h3>Your card content</h3>
 *         <p>sits here, on top of the highlight</p>
 *       </div>
 *     </GlassCursorHighlight>
 *   </div>
 *
 * On mobile, the highlight stays centered at 50/50 (no hover, no movement).
 */
type Props = {
  children: ReactNode;
  accent?: string;          // highlight color, defaults to primary
  radius?: number;          // highlight radius in pixels, defaults to 280
  opacity?: number;         // peak opacity 0-1, defaults to 0.35
  className?: string;
};

export default function GlassCursorHighlight({
  children,
  accent = "var(--color-primary, #22d3ee)",
  radius = 280,
  opacity = 0.35,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Cursor position relative to element (0-100 %)
  const x = useMotionValue(50);
  const y = useMotionValue(50);
  const sx = useSpring(x, { stiffness: 140, damping: 22, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 140, damping: 22, mass: 0.4 });

  const handleMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    x.set(px);
    y.set(py);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={`relative overflow-hidden ${className}`}
    >
      {/* The highlight layer — sits below content */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle ${radius}px at var(--gx) var(--gy), ${accent}, transparent 70%)`,
          opacity,
          mixBlendMode: "plus-lighter",
          // motion values expressed as CSS vars so the radial gradient updates cheaply
          ["--gx" as string]: sx.get ? `${sx.get()}%` : "50%",
          ["--gy" as string]: sy.get ? `${sy.get()}%` : "50%",
        } as React.CSSProperties}
        // we use motion.div's style prop is updated imperatively via CSS vars
        animate={{
          // no-op animate to enable motion reactivity; var updates come from
          // the MotionValue-to-string transform below
        }}
      />

      {/* Reactive CSS var binding — updates without layout thrash */}
      <CssVarBinder sx={sx} sy={sy} />

      {/* Actual content */}
      <div className="relative">{children}</div>
    </div>
  );
}

// Small internal component that subscribes to motion values and writes
// them as CSS custom properties on the parent via `useMotionValueEvent`-
// equivalent spring.on updates. Keeps the highlight GPU-cheap.
function CssVarBinder({
  sx,
  sy,
}: {
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Subscribe to both springs and write CSS vars on the *previous* sibling
  // (the highlight layer) on every frame.
  if (typeof window !== "undefined") {
    sx.on?.("change", (v: number) => {
      const prev = ref.current?.previousElementSibling as HTMLElement | null;
      if (prev) prev.style.setProperty("--gx", `${v}%`);
    });
    sy.on?.("change", (v: number) => {
      const prev = ref.current?.previousElementSibling as HTMLElement | null;
      if (prev) prev.style.setProperty("--gy", `${v}%`);
    });
  }

  return <div ref={ref} className="hidden" aria-hidden />;
}
