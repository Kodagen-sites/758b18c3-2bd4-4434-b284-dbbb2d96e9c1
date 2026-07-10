/**
 * PinnedHorizontalSlideshow — T19
 *
 * Section pins to the viewport. As the user scrolls DOWN, cards slide in
 * one at a time from the right. Each card holds for its scroll segment
 * before the next one replaces it. When all cards are shown the section
 * unpins and normal page scroll resumes.
 *
 * Perfect for: menu dishes, cocktail list, feature highlights, team members.
 *
 * Usage:
 *   <PinnedHorizontalSlideshow
 *     items={dishes.map(d => ({ id: d.slug, content: <DishCard {...d} /> }))}
 *   />
 *
 * Each item.content fills the sticky viewport — size it however you like.
 * The component provides the scroll mechanics; you own the card design.
 */

"use client";

import { useRef, type ReactNode } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export interface SlideshowItem {
  id: string | number;
  content: ReactNode;
}

interface Props {
  items: SlideshowItem[];
  /** vh multiplier per card — increase for slower reveal (default 1 = 100vh each) */
  cardScrollHeight?: number;
  className?: string;
  showDots?: boolean;
}

function Slide({
  item,
  index,
  total,
  scrollYProgress,
}: {
  item: SlideshowItem;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const enter = start + 0.06;
  const exit = end - 0.06;

  const x = useTransform(
    scrollYProgress,
    index === 0
      ? [0,       exit,    end]
      : [start,   enter,   exit,    end],
    index === 0
      ? ["0%",    "0%",    "-108%"]
      : ["108%",  "0%",    "0%",    "-108%"]
  );

  const opacity = useTransform(
    scrollYProgress,
    index === 0
      ? [0,     exit,   end]
      : [start, enter,  exit,  end],
    index === 0
      ? [1,     1,      0]
      : [0,     1,      1,     0]
  );

  return (
    <motion.div
      style={{ x, opacity }}
      className="absolute inset-0 flex items-center justify-center will-change-transform"
    >
      {item.content}
    </motion.div>
  );
}

function Dot({
  index,
  total,
  scrollYProgress,
}: {
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = index / total;
  const mid = (index + 0.5) / total;
  const end = (index + 1) / total;

  const scale = useTransform(
    scrollYProgress,
    [start, mid, end],
    [0.6, 1.6, 0.6]
  );
  const opacity = useTransform(
    scrollYProgress,
    [start, mid, end],
    [0.25, 1, 0.25]
  );

  return (
    <motion.div
      style={{ scale, opacity }}
      className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
    />
  );
}

export default function PinnedHorizontalSlideshow({
  items,
  cardScrollHeight = 1,
  className = "",
  showDots = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const totalVh = items.length * 100 * cardScrollHeight;

  return (
    <div ref={ref} style={{ height: `${totalVh}vh` }} className="relative">
      <div
        className={`sticky top-0 h-screen overflow-hidden ${className}`}
      >
        {items.map((item, i) => (
          <Slide
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            scrollYProgress={scrollYProgress}
          />
        ))}

        {showDots && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {items.map((_, i) => (
              <Dot
                key={i}
                index={i}
                total={items.length}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
