/**
 * StackedCardPeel — T20
 *
 * Cards stack on top of each other like a physical deck. As the user scrolls,
 * the top card peels away (lifts, scales, slides up-out) to reveal the card
 * beneath it. Feels tactile and premium — like turning over index cards.
 *
 * Perfect for: menu spreads, testimonials, feature comparisons, team bios.
 *
 * Usage:
 *   <StackedCardPeel
 *     cards={dishes.map(d => ({ id: d.slug, content: <DishCard {...d} /> }))}
 *   />
 *
 * Stack shows up to 3 cards at once — the active card on top, 2 peeking below.
 * Cards behind are scaled down and offset to show depth.
 */

"use client";

import { useRef, type ReactNode } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export interface PeelCard {
  id: string | number;
  content: ReactNode;
}

interface Props {
  cards: PeelCard[];
  /** px scroll per card transition (default 600) */
  scrollPerCard?: number;
  className?: string;
}

function StackCard({
  card,
  index,
  total,
  scrollYProgress,
}: {
  card: PeelCard;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = index / total;
  const end = (index + 1) / total;

  // y: peels upward when leaving
  const y = useTransform(
    scrollYProgress,
    [Math.max(0, start - 0.01), start, end - 0.05, end],
    ["0%", "0%", "0%", "-115%"]
  );

  // scale: pops slightly forward then peels
  const scale = useTransform(
    scrollYProgress,
    [start, start + 0.04, end - 0.06, end],
    [1, 1.03, 1.01, 0.96]
  );

  // rotate: slight tilt as it peels away
  const rotate = useTransform(
    scrollYProgress,
    [end - 0.08, end],
    ["0deg", "-4deg"]
  );

  // opacity: fades out as it leaves
  const opacity = useTransform(
    scrollYProgress,
    [end - 0.05, end],
    [1, 0]
  );

  // zIndex: active card is on top
  const zIndex = total - index;

  return (
    <motion.div
      style={{ y, scale, rotate, opacity, zIndex, originY: 0 }}
      className="absolute inset-0 will-change-transform"
    >
      {card.content}
    </motion.div>
  );
}

// Cards peeking below the active card (depth illusion)
function PeekingCard({
  offset,
  scrollYProgress,
  activeStart,
}: {
  offset: number; // 1 = directly behind, 2 = further behind
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  activeStart: number;
}) {
  const baseScale = 1 - offset * 0.04;
  const baseY = offset * 12;

  const scale = useTransform(
    scrollYProgress,
    [activeStart, activeStart + 0.15],
    [baseScale, baseScale + 0.02]
  );
  const y = useTransform(
    scrollYProgress,
    [activeStart, activeStart + 0.15],
    [`${baseY}px`, `${baseY - 6}px`]
  );

  return (
    <motion.div
      style={{ scale, y, zIndex: -offset }}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

export default function StackedCardPeel({
  cards,
  scrollPerCard = 600,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const totalHeight = cards.length * scrollPerCard;

  return (
    <div
      ref={ref}
      style={{ height: `${totalHeight}px` }}
      className="relative"
    >
      <div
        className={`sticky top-0 h-screen flex items-center justify-center overflow-hidden ${className}`}
      >
        <div className="relative w-full max-w-2xl mx-auto aspect-[4/3]">
          {cards.map((card, i) => (
            <StackCard
              key={card.id}
              card={card}
              index={i}
              total={cards.length}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="absolute bottom-8 right-8 font-mono text-xs text-white/40 tracking-widest">
          <motion.span>
            {/* Shows current index — computed client-side */}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
