"use client";

/**
 * CornerBadge — tiny chrome brand/product identifier pinned to a corner.
 * Displays a two-line mark: a primary brand label + a small metadata
 * sub-label (e.g. model/year/edition).
 *
 * Pattern extracted from a luxury automotive showcase hero where the
 * top-left corner read "Porsche / Type 930 · 1975". Adds premium feel
 * to hero sections at near-zero cost.
 *
 * Usage:
 *   <CornerBadge brand="Porsche" sub="Type 930 · 1975" />
 *   <CornerBadge brand="HOROLOG" sub="Caliber 08 · Swiss Made" position="top-right" />
 *
 * Use on: premium product/luxury hero pages (especially scroll-3D).
 * Skip on: casual SaaS, playful brands, anywhere the badge would read
 * as affectation rather than heritage signal.
 */
type Props = {
  brand: string;
  sub?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
};

const POSITION_STYLES: Record<NonNullable<Props["position"]>, React.CSSProperties> = {
  "top-left":     { top: 20, left: 20 },
  "top-right":    { top: 20, right: 20, textAlign: "right" },
  "bottom-left":  { bottom: 20, left: 20 },
  "bottom-right": { bottom: 20, right: 20, textAlign: "right" },
};

export default function CornerBadge({
  brand,
  sub,
  position = "top-left",
  className = "",
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed ${className}`}
      style={{
        zIndex: 100,
        ...POSITION_STYLES[position],
      }}
    >
      <div
        className="font-display font-extrabold uppercase"
        style={{
          fontSize: 13,
          letterSpacing: "0.2em",
          color: "rgba(245,241,232,0.25)",
        }}
      >
        {brand}
      </div>
      {sub && (
        <div
          className="font-mono mt-0.5"
          style={{
            fontSize: 8,
            letterSpacing: "0.12em",
            color: "rgba(245,241,232,0.15)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
