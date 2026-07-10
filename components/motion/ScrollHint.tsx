"use client";

import { useEffect, useState } from "react";

/**
 * ScrollHint — bottom-center thin gradient line + label, pulsing
 * gently. Auto-fades as the user scrolls past ~3% of the page.
 *
 * Pattern extracted from a luxury automotive scroll hero. Use on any
 * long-scroll hero (Archetype A, D, or planned H) to signal "there's
 * more below". Skip on short pages.
 *
 * Usage:
 *   <ScrollHint />
 *   <ScrollHint label="Discover" />
 *   <ScrollHint accentColor="#b8161c" />
 */
type Props = {
  label?: string;
  accentColor?: string;       // default gold
  target?: React.RefObject<HTMLElement>;   // optional scroll container
};

export default function ScrollHint({
  label = "Scroll to explore",
  accentColor = "#d4a24c",
  target,
}: Props) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const el = target?.current ?? document.scrollingElement ?? document.documentElement;
    if (!el) return;

    const update = () => {
      const scrollable =
        el === document.scrollingElement || el === document.documentElement
          ? document.documentElement
          : el;
      const max = scrollable.scrollHeight - scrollable.clientHeight;
      const progress = max > 0 ? scrollable.scrollTop / max : 0;
      // Fade out across 0.03 → 0.08
      if (progress < 0.03) setOpacity(1);
      else setOpacity(Math.max(0, 1 - (progress - 0.03) * 20));
    };

    update();
    const scrollEl = target?.current ?? window;
    scrollEl.addEventListener("scroll", update, { passive: true } as AddEventListenerOptions);

    return () => {
      scrollEl.removeEventListener("scroll", update as EventListener);
    };
  }, [target]);

  return (
    <>
      <style>{`
        @keyframes scrollHintPulse {
          0%,100% { opacity: 0.3; transform: translateY(0); }
          50%     { opacity: 1;   transform: translateY(4px); }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-opacity duration-500"
        style={{
          bottom: 32,
          zIndex: 100,
          opacity,
        }}
      >
        <div
          style={{
            width: 1,
            height: 28,
            background: `linear-gradient(to bottom, transparent, ${accentColor}80)`,
            animation: "scrollHintPulse 2s ease infinite",
          }}
        />
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(245,241,232,0.25)",
          }}
        >
          {label}
        </div>
      </div>
    </>
  );
}
