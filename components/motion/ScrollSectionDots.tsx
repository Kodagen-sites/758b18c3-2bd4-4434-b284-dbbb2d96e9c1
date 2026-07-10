"use client";

import { useEffect, useState } from "react";

/**
 * ScrollSectionDots — a right-rail vertical progress track with dot +
 * label per section. The active section highlights with the primary
 * color. Pairs with scroll-driven hero pages.
 *
 * Pattern from luxury-horology scroll hero: six roman-numeral dots on
 * the right rail, each marking a section of a long scroll narrative.
 * Highlights on active. Better than a single progress bar for
 * chaptered stories.
 *
 * Usage:
 *   // Auto-track the window scroll, roman numerals for 6 sections
 *   <ScrollSectionDots count={6} />
 *
 *   // Custom labels
 *   <ScrollSectionDots labels={["Heritage","Caliber","Atelier","Reserve"]} />
 *
 *   // Track a scrollable container instead of window
 *   <ScrollSectionDots count={5} target={scrollContainerRef} />
 *
 * Skip on short pages (Contact, 404). Designed for 400vh+ scroll narratives.
 */
type Props = {
  count?: number;                 // if `labels` not provided, use roman numerals I-V etc.
  labels?: string[];
  target?: React.RefObject<HTMLElement>;   // optional alternate scroll container
  className?: string;
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export default function ScrollSectionDots({
  count,
  labels,
  target,
  className = "",
}: Props) {
  const resolvedLabels =
    labels ?? Array.from({ length: count ?? 6 }, (_, i) => ROMAN[i] ?? String(i + 1));
  const total = resolvedLabels.length;

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const el = target?.current ?? document.scrollingElement ?? document.documentElement;
    if (!el) return;

    const update = () => {
      // Progress 0..1 based on scroll
      const scrollable =
        el === document.scrollingElement || el === document.documentElement
          ? document.documentElement
          : el;
      const max = scrollable.scrollHeight - scrollable.clientHeight;
      const progress = max > 0 ? scrollable.scrollTop / max : 0;
      // Clamp to index range
      const idx = Math.min(total - 1, Math.floor(progress * total));
      setActiveIdx(idx);
    };

    update();
    const scrollEl = target?.current ?? window;
    scrollEl.addEventListener("scroll", update, { passive: true } as AddEventListenerOptions);

    return () => {
      scrollEl.removeEventListener("scroll", update as EventListener);
    };
  }, [target, total]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed right-6 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-5 ${className}`}
    >
      {resolvedLabels.map((label, i) => {
        const isActive = i === activeIdx;
        return (
          <div key={i} className="flex flex-row-reverse items-center gap-2.5">
            <div
              className="rounded-full transition-all duration-500"
              style={{
                width: 6,
                height: 6,
                border: "1px solid",
                borderColor: isActive
                  ? "var(--color-primary, #d4a24c)"
                  : "rgba(212,162,76,0.3)",
                background: isActive
                  ? "var(--color-primary, #d4a24c)"
                  : "transparent",
              }}
            />
            <span
              className="font-mono text-[8px] tracking-[0.15em] transition-colors duration-500"
              style={{
                color: isActive
                  ? "var(--color-primary, #d4a24c)"
                  : "rgba(200,204,212,0.3)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}

      {/* Thin vertical track behind the dots */}
      <div
        className="absolute -right-0 top-0 bottom-0 w-px opacity-30"
        style={{ background: "rgba(200,204,212,0.1)", right: 2 }}
      />
    </div>
  );
}
