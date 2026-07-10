"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

/**
 * Scroll-driven hero text overlay — shows DIFFERENT chapters as the user scrolls
 * the scrub hero. It is progress-DRIVEN: you MUST feed it a live `progress` (0→1).
 *
 * WIRING (required — without this only chapter `at:0` ever shows and the hero goes
 * blank mid-scroll). ScrollCanvas exposes `onProgress(p)`; pipe it into state:
 *
 *   const [p, setP] = useState(0);
 *   <ScrollCanvas onProgress={setP} ...>
 *     <HeroScrollText
 *       progress={p}
 *       chapters={[
 *         { at: 0,    headlineLines: ["..."] },
 *         { at: 0.4,  headlineLines: ["..."] },
 *         { at: 0.75, headlineLines: ["..."] },
 *       ]}
 *     />
 *   </ScrollCanvas>
 *
 * RULES: (1) ALWAYS wire ScrollCanvas onProgress → this `progress` prop — never
 * pass a constant. (2) Use 3+ chapters so the hero changes through the scroll.
 * (3) Spread `at` thresholds across 0 → ~0.8 (e.g. 0 / 0.4 / 0.75); the last `at`
 * must be < the max progress the hero actually reaches, or that chapter never shows.
 *
 * LEGIBILITY: a scrim gradient + text-shadow are applied automatically and flip
 * polarity from `textColor` (dark backing for light text, light backing for dark
 * text) so the text stays readable over ANY background frame as it scrubs. Pass
 * `scrim` / `textShadow` only to override the defaults for a specific look.
 */
export interface HeroChapter {
  at: number;           // scroll progress threshold (0–1) when this chapter activates
  eyebrow?: string;
  headlineLines: string[];
  subline?: string;
  cta?: { label: string; href: string };
}

interface Props {
  progress: number;
  chapters: HeroChapter[];
  position?: "bottom-left" | "center" | "bottom-right";
  textColor?: string;
  accentColor?: string;
  accentTextColor?: string;
  showChapterDots?: boolean;
  /** Legibility scrim behind the text (CSS background). Defaults to a polarity-
   *  aware gradient derived from textColor — pass to override. */
  scrim?: string;
  /** CSS text-shadow on headline + subline. Defaults polarity-aware. */
  textShadow?: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

// Is the text color light? Used to flip the scrim + shadow polarity so the hero
// text stays legible over a SCRUBBING video/frame background (what's behind the
// text changes as you scroll, so we can't rely on the frame for contrast).
function isLightText(c: string): boolean {
  const m = /#([0-9a-fA-F]{6})/.exec(c || "");
  if (!m) return true; // unknown → assume light text (the common cinematic case)
  const n = parseInt(m[1], 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 140;
}

export default function HeroScrollText({
  progress,
  chapters,
  position = "bottom-left",
  textColor = "var(--color-cream, #f5ede1)",
  accentColor = "var(--color-terracotta, #c4623a)",
  accentTextColor = "var(--color-cream, #f5ede1)",
  showChapterDots = true,
  scrim,
  textShadow,
}: Props) {
  let activeIdx = 0;
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (progress >= chapters[i].at) { activeIdx = i; break; }
  }
  const chapter = chapters[activeIdx];

  // Legibility guarantee over the scrubbing background: a scrim gradient behind
  // the text + a text-shadow, both polarity-matched to the text color (dark
  // backing for light text, light backing for dark text). Override via props.
  const lightText = isLightText(textColor);
  const rgb = lightText ? "6,8,14" : "246,241,233";
  const scrimBg =
    scrim ??
    (position === "center"
      ? `radial-gradient(ellipse 78% 60% at 50% 52%, rgba(${rgb},0.50) 0%, transparent 72%)`
      : `linear-gradient(to top, rgba(${rgb},0.62) 0%, rgba(${rgb},0.30) 34%, transparent 72%)`);
  const txtShadow =
    textShadow ??
    (lightText
      ? "0 2px 28px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.45)"
      : "0 2px 26px rgba(255,255,255,0.55), 0 1px 3px rgba(255,255,255,0.5)");

  const wrapClass =
    position === "center"
      ? "absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      : position === "bottom-right"
      ? "absolute inset-x-0 bottom-0 flex flex-col items-end px-6 pb-16 md:pb-20"
      : "absolute inset-x-0 bottom-0 flex flex-col px-6 pb-16 md:pb-20";

  const innerClass =
    position === "center" ? "w-full max-w-4xl mx-auto" : "w-full max-w-7xl mx-auto";

  return (
    <div className={wrapClass}>
      {/* Legibility scrim — keeps the text readable over ANY background frame. */}
      <div
        aria-hidden
        className={
          position === "center"
            ? "pointer-events-none absolute inset-0"
            : "pointer-events-none absolute inset-x-0 bottom-0 h-[85vh]"
        }
        style={{ background: scrimBg }}
      />
      <div className={`relative ${innerClass}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {chapter.eyebrow && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.05, ease } }}
                className="block text-[11px] uppercase tracking-[0.25em]"
                style={{ color: accentColor }}
              >
                {chapter.eyebrow}
              </motion.span>
            )}

            <h1 className="mt-6 font-display" style={{ color: textColor, textShadow: txtShadow }}>
              {chapter.headlineLines.map((line, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.9, delay: 0.1 + i * 0.16, ease },
                  }}
                  className="block leading-[0.95] tracking-[-0.025em]"
                  style={{
                    fontSize: "clamp(2.75rem, 8vw, 6.5rem)",
                    fontWeight: i === 0 ? 400 : 300,
                    fontStyle: i === 1 ? "italic" : "normal",
                  }}
                >
                  {line}
                </motion.span>
              ))}
            </h1>

            {chapter.subline && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.8, delay: 0.42 } }}
                className="mt-6 max-w-xl text-lg md:text-xl"
                style={{ color: `color-mix(in srgb, ${textColor} 78%, transparent)`, textShadow: txtShadow }}
              >
                {chapter.subline}
              </motion.p>
            )}

            {chapter.cta && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.58, ease } }}
                className="mt-8"
              >
                <Link
                  href={chapter.cta.href}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-opacity hover:opacity-85"
                  style={{ background: accentColor, color: accentTextColor }}
                >
                  {chapter.cta.label}
                </Link>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {showChapterDots && chapters.length > 1 && (
          <div className="mt-10 flex items-center gap-2">
            {chapters.map((_, i) => (
              <div
                key={i}
                className="h-px rounded-full transition-all duration-500 ease-out"
                style={{
                  width: i === activeIdx ? 28 : 10,
                  opacity: i <= activeIdx ? 0.55 : 0.2,
                  background: textColor,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
