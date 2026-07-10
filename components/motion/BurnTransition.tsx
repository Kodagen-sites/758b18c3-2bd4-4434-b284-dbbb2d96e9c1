"use client";

import { motion, useInView, useMotionValue } from "framer-motion";
import { useEffect, useId, useRef, ReactNode } from "react";

/**
 * BurnTransition — wraps a section so it "burns into existence" when
 * scrolled into view. Heavy SVG displacement + fire-gradient overlay
 * peaks at ~40% of the animation, eases out to clean settled state.
 *
 * Inspired by the burn-dissolve transitions on premium creative studio
 * sites (e.g. unicorn.studio-style scroll reveals). Firm rule: use ONCE
 * per page as a moment. Multiple burns in one scroll = cheap.
 *
 * Usage:
 *   <BurnTransition>
 *     <section>Section content</section>
 *   </BurnTransition>
 *
 *   <BurnTransition intensity={120} duration={1.8} burnColor="#ff4500">
 *     <div className="py-32">Manifesto block</div>
 *   </BurnTransition>
 *
 * Respects prefers-reduced-motion via the `@media (prefers-reduced-motion)`
 * rule already in the skill's index.css.
 */
type Props = {
  children: ReactNode;
  intensity?: number;        // peak displacement scale (default 80)
  duration?: number;         // seconds (default 1.4)
  burnColor?: string;        // hex of the fire-edge (default warm orange)
  className?: string;
};

export default function BurnTransition({
  children,
  intensity = 80,
  duration = 1.4,
  burnColor = "#ff6a00",
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const filterId = `burn-${id}`;

  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  const scale = useMotionValue(intensity);
  const overlayOpacity = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;

    const start = performance.now();
    const durMs = duration * 1000;

    const tick = (now: number) => {
      const t = Math.min((now - start) / durMs, 1);

      // Displacement eases out as cubic
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      scale.set(intensity * (1 - easeOutCubic));

      // Overlay peaks at t=0.4, eases out
      const overlayPeak = 0.4;
      const overlayVal =
        t < overlayPeak
          ? (t / overlayPeak) * 0.65
          : Math.max(0, 0.65 * (1 - (t - overlayPeak) / (1 - overlayPeak)));
      overlayOpacity.set(overlayVal);

      if (t < 1) requestAnimationFrame(tick);
      else {
        scale.set(0);
        overlayOpacity.set(0);
      }
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, intensity, duration, scale, overlayOpacity]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden SVG filter definition */}
      <svg
        className="absolute w-0 h-0 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.02"
              numOctaves="3"
              seed="7"
              result="noise"
            />
            {/* motion's typing doesn't include SVG filter primitives out of
                the box; cast keeps the build clean across framer-motion
                versions (a bare @ts-expect-error errors as "unused" once the
                upstream type gap closes). */}
            <motion.feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={scale as any}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Content — filter applies only while inView */}
      <motion.div
        style={{
          filter: inView ? `url(#${filterId})` : "none",
          willChange: inView ? "filter, opacity" : undefined,
        }}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: duration * 0.75, delay: duration * 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>

      {/* Fire-edge overlay — same filter, same displacement, radial gradient */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 55%, ${burnColor}55 0%, ${burnColor}22 35%, transparent 70%)`,
          mixBlendMode: "plus-lighter",
          filter: inView ? `url(#${filterId})` : "none",
          opacity: overlayOpacity,
        }}
      />
    </div>
  );
}
