"use client";

/**
 * ScrollCanvas
 * Scroll-scrubbed frame sequence renderer. Pinned canvas + GSAP ScrollTrigger.
 *
 * Works for Archetypes A (24s dolly), B (8s object), D (narrative).
 * Not used by Archetypes C, E, F.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type LoadingVariant = "L1" | "L2" | "L3" | "L4";

type Props = {
  frameCount: number;
  pattern?: string;
  padLength?: number;
  scrollDistance?: number;
  snapPoints?: number[];
  // Frame-preloader overlay. loadingLabel is brand copy ("Unstoppering",
  // "Setting type", the brand name…); loadingVariant picks the visual
  // style. Both come from the build (manifest loading_variant + voice).
  loadingLabel?: string;
  loadingVariant?: LoadingVariant;
  children?: React.ReactNode;
  onProgress?: (progress: number) => void;
  // Safety net. The scroll-scrub canvas needs a JPG frame sequence. When those
  // frames are unavailable (extraction skipped, manifest empty, Storage upload
  // failed) every frame 404s and the canvas renders BLANK. `videoSrc` is the
  // hero clip from content/asset-manifest.json `videos["scene-1"]`, which is
  // ALWAYS present. If the first frame batch yields zero usable images we drop
  // the scrub and play this video as a loop hero instead of going blank.
  // ALWAYS pass it when wiring a scrub hero (the scrub-frames Phase Gate enforces it).
  videoSrc?: string;
};

export default function ScrollCanvas({
  frameCount,
  pattern = "/frames/frame_{n}.jpg",
  padLength = 4,
  scrollDistance = 3,
  snapPoints,
  loadingLabel = "Loading",
  loadingVariant = "L1",
  children,
  onProgress,
  videoSrc,
}: Props) {
  const containerRef = useRef<HTMLElement>(null);
  // GSAP pin wraps the pinned element in a pin-spacer div. If we pinned
  // the root <section> directly, React could not remove it on unmount
  // (client-side nav) → "removeChild" crash. So we pin an INNER div and
  // the section stays React-owned.
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameStateRef = useRef({ current: 0 });

  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  // True when the whole frame sequence 404s AND a videoSrc fallback exists —
  // render the loop video instead of a blank canvas.
  const [framesFailed, setFramesFailed] = useState(false);

  useEffect(() => {
    const images: HTMLImageElement[] = new Array(frameCount);
    let loadedCount = 0;
    let validCount = 0;
    let cancelled = false;

    const buildUrl = (i: number) => {
      const n = String(i + 1).padStart(padLength, "0");
      // Accept either placeholder form: {n} or the manifest's {NNNN}.
      return pattern.replace(/\{n+\}/i, n);
    };

    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          images[i] = img;
          validCount++;
          loadedCount++;
          setLoaded(loadedCount);
          resolve();
        };
        img.onerror = () => {
          if (cancelled) return;
          loadedCount++;
          setLoaded(loadedCount);
          resolve();
        };
        img.src = buildUrl(i);
      });

    (async () => {
      const firstBatch = Math.min(30, frameCount);
      await Promise.all(
        Array.from({ length: firstBatch }, (_, i) => loadOne(i))
      );
      if (cancelled) return;
      // Whole frame batch 404'd → fall back to the loop video so the hero is
      // never blank. Skip the canvas / ScrollTrigger path entirely.
      if (validCount === 0 && videoSrc) { setFramesFailed(true); return; }
      imagesRef.current = images;
      setReady(true);

      const queue = Array.from(
        { length: frameCount - firstBatch },
        (_, i) => i + firstBatch
      );
      // Defer the long tail until AFTER the window load event. Image()
      // fetches started during page load delay `load` — with 160+ frames
      // that held onLoad back for minutes, which (a) tanks LCP-adjacent
      // metrics for real visitors and (b) kept the builder's preview
      // iframe behind its splash overlay indefinitely (its reveal waits
      // on iframe onLoad). The hero is already scrubbable on firstBatch;
      // the tail just sharpens long-scroll frames.
      const loadRest = async () => {
        if (cancelled) return;
        const workers = Array.from({ length: 8 }, async () => {
          while (queue.length && !cancelled) {
            const idx = queue.shift()!;
            await loadOne(idx);
          }
        });
        await Promise.all(workers);
      };
      if (document.readyState === "complete") {
        void loadRest();
      } else {
        window.addEventListener("load", () => setTimeout(loadRest, 150), { once: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frameCount, pattern, padLength, videoSrc]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const pinEl = pinRef.current;
    if (!canvas || !container || !pinEl) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(frameStateRef.current.current);
    };

    const draw = (index: number) => {
      const img = imagesRef.current[index];
      if (!img || !img.width) return;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // COVER on every viewport so the hero always fills the full height —
      // the landscape (16:9) frame scales to fill the screen, cropping the
      // sides on portrait mobile rather than leaving empty letterbox bands
      // (which read as "hero not full height"). On portrait-mobile we bias
      // the crop slightly UP (focal 0.42) so the composition's subject stays
      // in frame instead of the centre being lost.
      const portraitMobile = cw < 768 && ch >= cw;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = portraitMobile ? (ch - dh) * 0.42 : (ch - dh) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    resize();
    window.addEventListener("resize", resize);

    const state = frameStateRef.current;
    const isMobile = window.innerWidth < 768;

    // gsap.context scopes everything created inside; ctx.revert() on
    // cleanup synchronously undoes the pin + removes the pin-spacer
    // BEFORE React unmounts the subtree — prevents the removeChild crash.
    const gctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${scrollDistance * 100}%`,
        // Pin the INNER div, never the component root section.
        pin: pinEl,
        pinSpacing: true,
        scrub: 0.5,
        snap: isMobile || !snapPoints
          ? undefined
          : {
              snapTo: snapPoints,
              duration: { min: 0.2, max: 0.6 },
              delay: 0.1,
              ease: "power2.inOut",
            },
        onUpdate: (self) => {
          const target = Math.min(
            frameCount - 1,
            Math.floor(self.progress * (frameCount - 1))
          );
          if (target !== state.current) {
            state.current = target;
            draw(target);
          }
          onProgress?.(self.progress);
        },
      });
    }, container);

    return () => {
      window.removeEventListener("resize", resize);
      gctx.revert();
    };
  }, [ready, frameCount, scrollDistance, snapPoints, onProgress]);

  // Outer section has NO fixed height — GSAP pins the inner div and inserts
  // a tall pin-spacer; the section must be free to grow to that height.
  return (
    <section ref={containerRef} className="relative w-full">
      <div ref={pinRef} className="relative h-[100dvh] w-full overflow-hidden">
        {framesFailed && videoSrc ? (
          // Frames unavailable → loop the hero video instead of a blank canvas.
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            style={{ background: "var(--bg-color, #000)" }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ background: "var(--bg-color, #000)" }}
          />
        )}

        {!ready && !framesFailed && (
          <LoadingOverlay
            variant={loadingVariant}
            label={loadingLabel}
            loaded={loaded}
            frameCount={frameCount}
            pattern={pattern}
            padLength={padLength}
          />
        )}

        <div className="pointer-events-none relative z-10 h-full">
          {children}
        </div>
      </div>
    </section>
  );
}

// ── Frame-preloader overlay — 3 brand-selectable variants ─────
// Colours come from CSS vars (--bg-color / --fg-color) so the loader
// matches the site theme on any palette — no hardcoded white.
function LoadingOverlay({
  variant,
  label,
  loaded,
  frameCount,
  pattern,
  padLength,
}: {
  variant: LoadingVariant;
  label: string;
  loaded: number;
  frameCount: number;
  pattern: string;
  padLength: number;
}) {
  const pct = Math.round((loaded / Math.max(1, frameCount)) * 100);
  const wrap = "fixed inset-0 z-50 flex items-center justify-center";
  const shell: React.CSSProperties = {
    height: "100dvh",
    background: "var(--bg-color, #0a0a0a)",
    color: "var(--fg-color, #f4efe6)",
  };

  // L4 — frame reveal: cycle the frames already downloaded, so the hero
  // footage "plays itself in" while loading. Zero extra asset.
  if (variant === "L4") {
    return (
      <FrameRevealLoader
        label={label}
        loaded={loaded}
        frameCount={frameCount}
        pattern={pattern}
        padLength={padLength}
      />
    );
  }

  // L2 — big count: a large percentage number, counting up.
  if (variant === "L2") {
    return (
      <div className={wrap} style={shell}>
        <div className="flex flex-col items-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.34em] opacity-50">
            {label}
          </span>
          <span className="mt-2 font-display text-[clamp(80px,17vw,210px)] font-light leading-none tabular-nums">
            {pct}
            <span className="align-top text-[0.28em] opacity-45">%</span>
          </span>
        </div>
      </div>
    );
  }

  // L3 — word mask: the label fills left→right as frames load.
  if (variant === "L3") {
    return (
      <div className={wrap} style={shell}>
        <div className="relative whitespace-nowrap font-display text-[clamp(30px,6.5vw,84px)] font-light uppercase tracking-[0.14em]">
          <span style={{ opacity: 0.16 }}>{label}</span>
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${pct}%` }}
          >
            {label}
          </span>
        </div>
      </div>
    );
  }

  // L1 — hairline bar (default, understated/editorial).
  return (
    <div className={wrap} style={shell}>
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.32em] opacity-60">
          {label}
        </span>
        <span
          className="block h-px w-48 overflow-hidden"
          style={{ background: "color-mix(in srgb, currentColor 16%, transparent)" }}
        >
          <span
            className="block h-full transition-[width] duration-150"
            style={{ width: `${pct}%`, background: "currentColor" }}
          />
        </span>
        <span className="font-mono text-[10px] tabular-nums opacity-40">
          {loaded} / {frameCount}
        </span>
      </div>
    </div>
  );
}

// L4 helper — cycles whatever frames have downloaded so far.
function FrameRevealLoader({
  label,
  loaded,
  frameCount,
  pattern,
  padLength,
}: {
  label: string;
  loaded: number;
  frameCount: number;
  pattern: string;
  padLength: number;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (loaded < 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % Math.max(1, loaded));
    }, 84); // ~12fps preview cycle
    return () => clearInterval(id);
  }, [loaded]);

  const safeIdx = loaded > 0 ? Math.min(idx, loaded - 1) : 0;
  const n = String(safeIdx + 1).padStart(padLength, "0");
  const frameSrc = pattern.replace(/\{n+\}/i, n);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ height: "100dvh", background: "var(--bg-color, #0a0a0a)", color: "var(--fg-color, #f4efe6)" }}
    >
      {loaded > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frameSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--bg-color, #0a0a0a) 52%, transparent)" }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] opacity-75">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums opacity-45">
          {loaded} / {frameCount}
        </span>
      </div>
    </div>
  );
}
