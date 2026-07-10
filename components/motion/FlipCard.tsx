"use client";

import { useState, type ReactNode } from "react";

/**
 * FlipCard — T23
 * CSS 3D flip. Front shows on idle, back reveals on hover (or programmatically).
 * Uses pure CSS transforms — no framer-motion — for rock-solid backface hiding.
 */
interface Props {
  front: ReactNode;
  back: ReactNode;
  aspectClass?: string;
  axis?: "Y" | "X";
  duration?: number;
  className?: string;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
}

export default function FlipCard({
  front,
  back,
  aspectClass = "aspect-[3/4]",
  axis = "Y",
  duration = 0.55,
  className = "",
  flipped: controlledFlipped,
  onFlip,
}: Props) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isControlled = controlledFlipped !== undefined;
  const isFlipped = isControlled ? controlledFlipped : internalFlipped;

  function toggle() {
    if (isControlled) {
      onFlip?.(!controlledFlipped);
    } else {
      setInternalFlipped((f) => !f);
      onFlip?.(!internalFlipped);
    }
  }

  const rotateFlipped = axis === "Y" ? "rotateY(180deg)" : "rotateX(180deg)";
  const rotateBack    = axis === "Y" ? "rotateY(180deg)" : "rotateX(180deg)";

  return (
    <div
      className={`relative cursor-pointer ${aspectClass} ${className}`}
      style={{ perspective: "1200px" }}
      onMouseEnter={() => !isControlled && setInternalFlipped(true)}
      onMouseLeave={() => !isControlled && setInternalFlipped(false)}
      onClick={toggle}
    >
      {/* Card inner — preserve-3d is the key */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transition: `transform ${duration}s cubic-bezier(0.4,0,0.2,1)`,
          transform: isFlipped ? rotateFlipped : "none",
        }}
      >
        {/* Front face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="rounded-2xl overflow-hidden"
        >
          {front}
        </div>

        {/* Back face — pre-rotated 180° away from viewer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: rotateBack,
          }}
          className="rounded-2xl overflow-hidden bg-[var(--color-card-bg,#1a1712)] border border-white/10"
        >
          {back}
        </div>
      </div>
    </div>
  );
}
