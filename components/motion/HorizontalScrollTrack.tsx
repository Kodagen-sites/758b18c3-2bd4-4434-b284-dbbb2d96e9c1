/**
 * HorizontalScrollTrack — T22
 *
 * A horizontal strip of cards that moves LEFT as the user scrolls DOWN.
 * The section pins to the viewport for the full duration of the horizontal
 * traverse, then unpins. Feels like turning the pages of a wide magazine
 * or browsing a bar menu on a long shelf.
 *
 * Perfect for: cocktail list, product shelf, portfolio work grid,
 *              partner logos (premium version), gallery strip.
 *
 * Usage:
 *   <HorizontalScrollTrack
 *     items={cocktails.map(c => ({ id: c.slug, content: <CocktailCard {...c} /> }))}
 *     cardWidth={420}
 *     gap={24}
 *   />
 *
 * Tip: add a label section before the pin starts so users know to scroll.
 */

"use client";

import { useRef, type ReactNode } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export interface TrackItem {
  id: string | number;
  content: ReactNode;
}

interface Props {
  items: TrackItem[];
  /** Width of each card in px (default 400) */
  cardWidth?: number;
  /** Gap between cards in px (default 24) */
  gap?: number;
  /** Left padding before first card in px (default 80) */
  paddingLeft?: number;
  /** Height of the sticky viewport (default "100vh") */
  viewportHeight?: string;
  className?: string;
  /** Optional fixed label shown top-left while section is pinned */
  sectionLabel?: string;
  /** Extra scroll buffer beyond the card travel, in vh (default 30) */
  bufferVh?: number;
}

export default function HorizontalScrollTrack({
  items,
  cardWidth = 400,
  gap = 24,
  paddingLeft = 80,
  viewportHeight = "100vh",
  className = "",
  sectionLabel,
  bufferVh = 30,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Pixel distance the track travels left so the last card is fully visible.
  // We add paddingLeft so even the last card clears the left edge on entry.
  const totalTrackPx = items.length * (cardWidth + gap) - gap;
  const travelPx = totalTrackPx + paddingLeft;

  const x = useTransform(scrollYProgress, [0, 1], [0, -travelPx]);

  return (
    <div
      ref={ref}
      style={{ height: `calc(${travelPx}px + ${bufferVh}vh + 100vh)` }}
      className="relative"
    >
      <div
        className={`sticky top-0 overflow-hidden flex flex-col justify-center ${className}`}
        style={{ height: viewportHeight }}
      >
        {sectionLabel && (
          <p className="absolute top-10 left-10 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 z-10">
            {sectionLabel}
          </p>
        )}

        {/* Scroll hint arrow */}
        <div className="absolute bottom-8 left-10 font-mono text-[10px] uppercase tracking-widest text-white/30 flex items-center gap-2 z-10">
          <span>Scroll to browse</span>
          <span className="text-[var(--color-accent)]">→</span>
        </div>

        {/* The track */}
        <motion.div
          style={{
            x,
            display: "flex",
            alignItems: "center",
            gap: `${gap}px`,
            paddingLeft: `${paddingLeft}px`,
            paddingRight: `${paddingLeft}px`,
            willChange: "transform",
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{ width: `${cardWidth}px`, flexShrink: 0 }}
            >
              {item.content}
            </div>
          ))}
        </motion.div>

        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10 z-10">
          <motion.div
            style={{ scaleX: scrollYProgress, originX: 0 }}
            className="h-full bg-[var(--color-accent)]"
          />
        </div>
      </div>
    </div>
  );
}
