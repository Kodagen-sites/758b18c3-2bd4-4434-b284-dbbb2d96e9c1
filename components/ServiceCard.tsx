"use client";

import Link from "next/link";
import { GlassCursorHighlight } from "@/components/motion";

/**
 * CV4 — Liquid Glass
 *
 * Frosted backdrop-blur card with a gradient hairline border and a
 * cursor-tracked radial highlight inside (via GlassCursorHighlight).
 * The card itself is translucent, so it works beautifully over video,
 * pastel backgrounds, and dreamy scenes.
 *
 * Use when:
 *   - Premium tech, AI, dreamy creative brands
 *   - Styles: S1, S8, S10
 *   - Personality: premium + playful mix, or fully dreamy
 *   - Site has a video/gradient background under the grid
 *
 * Recommended grid: `grid grid-cols-1 md:grid-cols-3 gap-6`
 *
 * Pairs well with: LiquidHover on the card's inner image if present.
 */

type Service = {
  slug: string;
  name: string;
  description: string;
};

type Props = {
  service: Service;
  index?: number;
  imageSrc?: string;
};

export default function ServiceCardV4({ service, imageSrc }: Props) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group relative block rounded-2xl overflow-hidden h-full transition-transform duration-500 hover:-translate-y-1"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.14), 0 20px 60px -20px rgba(0,0,0,0.55)",
      }}
    >
      {/* Gradient hairline border, tracks hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          padding: 1,
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(34,211,238,0.6), rgba(236,72,153,0.6), rgba(34,211,238,0.6))",
          WebkitMask:
            "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <GlassCursorHighlight accent="var(--color-primary, #22d3ee)" opacity={0.28} radius={320}>
        {imageSrc && (
          <div className="aspect-[4/3] relative overflow-hidden">
            <img
              src={imageSrc}
              alt={service.name}
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            {/* Bottom fade so text below reads */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg/40 to-transparent" />
          </div>
        )}

        <div className="p-6 relative">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary/80 mb-3">
            Service
          </div>
          <h3 className="font-display text-xl md:text-2xl text-white mb-3 font-light leading-tight">
            {service.name}
          </h3>
          <p className="text-white/70 text-sm leading-relaxed line-clamp-3">
            {service.description}
          </p>
          <div className="mt-5 font-mono text-xs text-white/50 group-hover:text-primary transition-colors">
            Explore →
          </div>
        </div>
      </GlassCursorHighlight>
    </Link>
  );
}
