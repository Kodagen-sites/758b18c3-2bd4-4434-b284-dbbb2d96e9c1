/**
 * FullscreenSequential — T21
 *
 * Each item takes over the full viewport. Section pins while the user scrolls
 * through all items — each one is fully seen and held before the crossfade
 * to the next. When the last item has been shown, section unpins.
 *
 * Perfect for: Happy Hour offers, feature comparisons, brand pillars,
 *              "why us" reasons, service tiers.
 *
 * Usage:
 *   <FullscreenSequential
 *     items={offers.map(o => ({
 *       id: o.slug,
 *       label: o.tag,          // e.g. "Happy Hour · 4PM–7PM"
 *       heading: o.title,      // e.g. "50% off all cocktails."
 *       body: o.description,
 *       accentColor: o.color,  // optional per-item accent override
 *     }))}
 *   />
 *
 * Or pass `content` for fully custom layouts:
 *   items={[{ id: 'a', content: <MyFullscreenPanel /> }]}
 */

"use client";

import { useRef, type ReactNode } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export interface SequentialItem {
  id: string | number;
  /** Fully custom content — used if provided, ignores label/heading/body */
  content?: ReactNode;
  /** Auto-layout fields (used when content is not provided) */
  label?: string;
  heading?: string;
  body?: string;
  accentColor?: string;
}

interface Props {
  items: SequentialItem[];
  /** vh per item. More = slower, more deliberate (default 120) */
  itemScrollHeight?: number;
  /** Background colour cycle — one per item. Falls back to --bg-primary */
  backgroundColors?: string[];
  className?: string;
}

function SequentialSlide({
  item,
  index,
  total,
  scrollYProgress,
  bgColor,
}: {
  item: SequentialItem;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  bgColor?: string;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const mid = (start + end) / 2;
  const holdStart = start + 0.08;
  const holdEnd = end - 0.08;

  // opacity: fade in → hold → fade out
  const opacity = useTransform(
    scrollYProgress,
    index === 0
      ? [0,          holdEnd, end]
      : [start,      holdStart, holdEnd, end],
    index === 0
      ? [1,          1,       0]
      : [0,          1,       1,        0]
  );

  // y: slight upward drift while visible (parallax feel)
  const y = useTransform(
    scrollYProgress,
    [start, end],
    ["2%", "-2%"]
  );

  // scale: breathes in very slightly on entry
  const scale = useTransform(
    scrollYProgress,
    [start, holdStart, holdEnd, end],
    [0.98, 1, 1, 0.98]
  );

  const accent = item.accentColor ?? "var(--color-accent)";

  return (
    <motion.div
      style={{ opacity, y, scale, backgroundColor: bgColor }}
      className="absolute inset-0 flex flex-col items-center justify-center px-8 will-change-transform"
    >
      {item.content ?? (
        <div className="max-w-3xl mx-auto text-center">
          {item.label && (
            <motion.p
              className="font-mono text-xs uppercase tracking-[0.3em] mb-6"
              style={{ color: accent }}
            >
              {item.label}
            </motion.p>
          )}
          {item.heading && (
            <h2
              className="font-display text-5xl md:text-7xl font-light leading-[1.1] text-white mb-6"
            >
              {item.heading}
            </h2>
          )}
          {item.body && (
            <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
              {item.body}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ProgressBar({
  index,
  total,
  scrollYProgress,
}: {
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const start = index / total;
  const end = (index + 1) / total;

  const scaleX = useTransform(scrollYProgress, [start, end], [0, 1]);
  const opacity = useTransform(
    scrollYProgress,
    [Math.max(0, start - 0.02), start, end, Math.min(1, end + 0.02)],
    [0.3, 1, 1, 0.3]
  );

  return (
    <div className="relative flex-1 h-px bg-white/10 overflow-hidden">
      <motion.div
        style={{ scaleX, opacity, originX: 0 }}
        className="absolute inset-0 bg-[var(--color-accent)]"
      />
    </div>
  );
}

export default function FullscreenSequential({
  items,
  itemScrollHeight = 120,
  backgroundColors = [],
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const totalVh = items.length * itemScrollHeight;

  return (
    <div ref={ref} style={{ height: `${totalVh}vh` }} className="relative">
      <div
        className={`sticky top-0 h-screen overflow-hidden ${className}`}
        style={{ backgroundColor: backgroundColors[0] ?? "var(--bg-primary)" }}
      >
        {items.map((item, i) => (
          <SequentialSlide
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            scrollYProgress={scrollYProgress}
            bgColor={backgroundColors[i]}
          />
        ))}

        {/* Bottom progress bars — one per item */}
        <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-8 pb-6 z-10">
          {items.map((_, i) => (
            <ProgressBar
              key={i}
              index={i}
              total={items.length}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>

        {/* Item counter */}
        <div className="absolute top-6 right-8 font-mono text-[10px] uppercase tracking-widest text-white/30 z-10">
          {items.map((_, i) => {
            const start = i / items.length;
            const end = (i + 1) / items.length;
            const opacity = useTransform(
              scrollYProgress,
              [start, start + 0.1, end - 0.1, end],
              [0, 1, 1, 0]
            );
            return (
              <motion.span key={i} style={{ opacity }} className="absolute">
                {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
