"use client";

import { useEffect, useRef } from "react";

/**
 * MOTION — CanvasAtmosphere
 *
 * Full-screen, fixed-position 2D canvas that renders an ambient particle
 * atmosphere behind the DOM. A $0 alternative to a video hero or a WebGL
 * canvas for DOM-heavy sites that still want the "alive background" quality.
 *
 * Pattern extracted from Source 7 (NexaAI). Their inline version:
 *   - 120 Particle instances, each with random size/speed/opacity/pulse
 *   - Mouse repulsion inside a 150px radius
 *   - Connection lines drawn between pairs closer than 120px
 *   - Two ambient CSS glow blobs (filter: blur 150px) as a color bed
 *
 * Generalized here into three modes that cover the common reference styles:
 *
 *   mode="particles"  — just drifting dots. Simplest. Good for dark editorial
 *                       hero with content-heavy layout (NexaAI-without-network).
 *   mode="network"    — dots + lines between nearby pairs (full S7 pattern).
 *                       Feels "technological / neural / data." Don't use for
 *                       warm luxury brands.
 *   mode="drift"      — large soft blurred blobs that drift slowly, no dots.
 *                       Closest to the Valence SDF-sphere feeling with zero
 *                       WebGL. Good for labs, science, healthcare.
 *
 * Scales particle count to viewport area so a phone doesn't run the same load
 * as a 4K monitor. `density` controls the base; actual count = density * √area.
 *
 * Respects prefers-reduced-motion (renders a static frame, then pauses).
 */

type Mode = "particles" | "network" | "drift";

type Props = {
  mode?: Mode;
  /**
   * Base particle count multiplier. Default 120 at ~1920×1080. Actual count
   * scales by √(area / (1920×1080)) so phones render ~60-70 and ultrawides ~170.
   */
  density?: number;
  /**
   * Primary particle color, hex string. In "drift" mode this is the blob
   * color. Default "#c9a84c" (gold — swap for brand accent).
   */
  color?: string;
  /**
   * Secondary accent color for 30-50% of particles (adds visual depth).
   * Default "#e8d48b" (pale gold).
   */
  accentColor?: string;
  /**
   * Background color. Canvas clears to this each frame. Set to
   * "transparent" (default) to let whatever's underneath show through.
   */
  bgColor?: string;
  /** Max opacity of individual particles/blobs. 0..1. Default 0.5. */
  opacity?: number;
  /** Enable mouse-repulsion zone around pointer. Default true for particles/network. */
  mouseRepel?: boolean;
  /** z-index of the canvas. Default 0 (sits behind most DOM content). */
  zIndex?: number;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  baseOpacity: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
  accent: boolean;
};

export default function CanvasAtmosphere({
  mode = "particles",
  density = 120,
  color = "#c9a84c",
  accentColor = "#e8d48b",
  bgColor = "transparent",
  opacity = 0.5,
  mouseRepel = true,
  zIndex = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0,
      h = 0;
    let particles: Particle[] = [];
    let mouseX = -9999,
      mouseY = -9999;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      // Recompute particle count based on area.
      const scale = Math.sqrt((w * h) / (1920 * 1080));
      const count = Math.round(density * scale);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(makeParticle(w, h, mode, opacity));
      }
    };

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    resize();

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const draw = () => {
      // Clear (or leave transparent)
      if (bgColor === "transparent") {
        ctx.clearRect(0, 0, w, h);
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }

      for (const p of particles) {
        // Update
        if (!prefersReduced) {
          p.x += p.speedX;
          p.y += p.speedY;
          p.pulse += p.pulseSpeed;
          p.opacity = p.baseOpacity + Math.sin(p.pulse) * 0.15 * opacity;

          if (mouseRepel && mode !== "drift") {
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 150 * 150 && d2 > 1) {
              const d = Math.sqrt(d2);
              const force = (150 - d) / 150;
              p.x -= (dx / d) * force * 1.5;
              p.y -= (dy / d) * force * 1.5;
              p.opacity = Math.min(1, p.opacity + force * 0.3);
            }
          }

          // Wrap around viewport.
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }

        // Draw
        ctx.beginPath();
        if (mode === "drift") {
          // Large blurred blob
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, hexWithAlpha(p.accent ? accentColor : color, p.opacity));
          grad.addColorStop(1, hexWithAlpha(p.accent ? accentColor : color, 0));
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Small dot (+ halo for larger ones in "network" mode)
          ctx.fillStyle = hexWithAlpha(
            p.accent ? accentColor : color,
            p.opacity
          );
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          if (mode === "network" && p.size > 1.2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = hexWithAlpha(color, p.opacity * 0.08);
            ctx.fill();
          }
        }
      }

      // Network connections
      if (mode === "network") {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 120 * 120) {
              const alpha = (1 - Math.sqrt(d2) / 120) * 0.06;
              ctx.strokeStyle = hexWithAlpha(color, alpha);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      if (!prefersReduced) {
        raf = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [mode, density, color, accentColor, bgColor, opacity, mouseRepel]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex,
      }}
    />
  );
}

// ── helpers ────────────────────────────────────────────────────────

function makeParticle(w: number, h: number, mode: Mode, opacity: number): Particle {
  const isDrift = mode === "drift";
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: isDrift
      ? 120 + Math.random() * 260 // large blurred blobs
      : Math.random() * 1.8 + 0.3, // small dots
    speedX: (Math.random() - 0.5) * (isDrift ? 0.08 : 0.3),
    speedY: (Math.random() - 0.5) * (isDrift ? 0.06 : 0.3),
    baseOpacity: (isDrift ? 0.03 + Math.random() * 0.07 : 0.1 + Math.random() * 0.4) * (opacity / 0.5),
    opacity: 0,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.02 + 0.005,
    accent: Math.random() > 0.55,
  };
}

function hexWithAlpha(hex: string, alpha: number): string {
  // Accepts #rgb or #rrggbb. Returns rgba(...) for canvas compositing.
  const m = hex.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!m) return `rgba(255,255,255,${alpha})`;
  let s = m[1];
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  const n = parseInt(s, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
