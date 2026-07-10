/**
 * Scroll progress utilities for overlay fade-in/out calculations.
 */

/**
 * Returns a 0..1 value representing how far through [start, end] progress p is.
 * Below start: 0. Above end: 1. In between: linear.
 *
 * Usage:
 *   const hero = range(progress, 0.0, 0.15) - range(progress, 0.15, 0.25);
 *   //           fade in                      fade out
 */
export function range(p: number, start: number, end: number): number {
  if (p <= start) return 0;
  if (p >= end) return 1;
  return (p - start) / (end - start);
}

/**
 * Returns an eased version of range() using smoothstep.
 */
export function rangeSmooth(p: number, start: number, end: number): number {
  const t = range(p, start, end);
  return t * t * (3 - 2 * t);
}

/**
 * Calculates block visibility — fade in + hold + fade out.
 *
 * block(p, 0.15, 0.30) produces:
 *   0.00–0.15 → 0 (invisible before)
 *   0.15–0.20 → 0→1 (fade in)
 *   0.20–0.25 → 1 (hold)
 *   0.25–0.30 → 1→0 (fade out)
 *   0.30–1.00 → 0 (invisible after)
 */
export function block(p: number, start: number, end: number, fadeFrac = 0.33): number {
  const total = end - start;
  const fadeSpan = total * fadeFrac;
  const fadeIn = range(p, start, start + fadeSpan);
  const fadeOut = range(p, end - fadeSpan, end);
  return fadeIn - fadeOut;
}
