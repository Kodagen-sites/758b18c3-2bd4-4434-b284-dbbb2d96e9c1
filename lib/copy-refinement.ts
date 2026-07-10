/**
 * Copy refinement — voice-constraint prompt builder + post-response
 * quality gates. Designed for SINGLE-CALL refinement: the existing
 * generateSiteCopy LLM call absorbs the voice constraints inline,
 * rather than doing a second refinement pass.
 *
 * Ported from .cinematic-skill/cinematic-site-generator/references/copy-refinement.md.
 *
 * Callers flow:
 *   1. If you have a styleId, call getVoiceForStyle(styleId).
 *   2. Append buildVoicePromptSection(voice, styleId) to the copy prompt.
 *   3. After the LLM returns, call runQualityGates(copy, voice).
 *   4. Log failures; do not fail the build (per skill's fallback rule —
 *      incomplete refinement is better than missing pages).
 *
 * If the single-call quality is poor, we have the option to promote this
 * module to do its own askClaude refinement pass — the prompt section
 * here is already shaped for that recipe.
 */

import type { StyleId, VoiceFamily, VoiceFamilyId } from "./voice-banks";
import { getStyleOverride } from "./voice-banks";

/**
 * Hero-body maximum word count per voice family.
 * From copy-refinement.md §Quality gates: "Hero body ≤ 40 words for
 * most voices; V2 and V7 can go to 60."
 */
const HERO_BODY_MAX_WORDS: Record<VoiceFamilyId, number> = {
  V1: 40, V2: 60, V3: 40, V4: 40, V5: 40, V6: 40, V7: 60,
};

/**
 * Per-voice maximum word count for a services.items[] description.
 * V1/V5 are the most compressed (fragment-rhythm, one-sentence punch);
 * V2/V7 allow the longest (two sentences with defining + proof).
 * Values drawn from each voice family's "Service/feature line patterns"
 * block in voice-banks.md.
 */
const ITEM_DESC_MAX_WORDS: Record<VoiceFamilyId, number> = {
  V1: 25, V2: 40, V3: 25, V4: 30, V5: 20, V6: 30, V7: 40,
};

export function getHeroBodyLimit(voiceId: VoiceFamilyId): number {
  return HERO_BODY_MAX_WORDS[voiceId];
}

export function getItemDescriptionLimit(voiceId: VoiceFamilyId): number {
  return ITEM_DESC_MAX_WORDS[voiceId];
}

// ─── Prompt builder ─────────────────────────────────────────────────────

/**
 * Build a voice-constraint block to append to the main copy-generator
 * prompt. Contains the voice's tone, rhythm, opening formulas, ban list,
 * signature moves, per-slot patterns, and the self-check rules from the
 * refinement recipe in copy-refinement.md.
 *
 * This string is designed to sit AFTER the BRAND CONTEXT / SCRAPED
 * ANCHORS blocks and BEFORE the RULES block in generateSiteCopy, so the
 * model reads the voice constraints as the dominant instruction.
 */
export function buildVoicePromptSection(voice: VoiceFamily, styleId: StyleId): string {
  const override = getStyleOverride(voice, styleId);

  const lines: string[] = [];

  lines.push(`VOICE TARGET — ${voice.id} ${voice.name}  (style: ${styleId})`);
  lines.push(`Character: ${voice.character}`);
  lines.push(``);

  lines.push(`Tone keywords: ${voice.toneKeywords.join(", ")}`);
  lines.push(``);

  lines.push(`Sentence rhythm:`);
  for (const r of voice.sentenceRhythm) lines.push(`  • ${r}`);
  lines.push(``);

  lines.push(`Opening-line formulas for the hero headline (pick ONE and follow it exactly):`);
  for (const f of voice.openingFormulas) lines.push(`  • ${f}`);
  lines.push(``);

  lines.push(`BAN LIST — these words / phrases NEVER appear in any output field:`);
  lines.push(`  ${voice.banList.map((w) => `"${w}"`).join(", ")}`);
  lines.push(``);

  lines.push(`Signature moves — use at least one in the hero section:`);
  for (const m of voice.signatureMoves) lines.push(`  • ${m}`);
  lines.push(``);

  lines.push(`CTA language bank — draw primary/secondary CTAs from this list:`);
  lines.push(`  ${voice.ctaBank.map((c) => `"${c}"`).join(", ")}`);
  lines.push(``);

  lines.push(`Service/feature line pattern:`);
  lines.push(`  • Name pattern: ${voice.serviceLinePattern.name}`);
  lines.push(`  • Description pattern: ${voice.serviceLinePattern.description}`);
  lines.push(``);

  lines.push(`hero.body — REQUIRED when voice is active (new slot):`);
  lines.push(`  • 1–2 sentences, ${HERO_BODY_MAX_WORDS[voice.id]} words MAX for ${voice.id}.`);
  lines.push(`  • Sits directly under the H1. Use at least one signature move.`);
  lines.push(`  • Must pass the ban-word scan AND include one specific anchor (number, place, material, practice).`);
  lines.push(`  • Carries DISTINCT information from tagline and hero.subheadline — do not paraphrase either.`);
  lines.push(``);

  lines.push(`services.items[] — REQUIRED when candidate service names are supplied above:`);
  lines.push(`  • For each candidate name, produce { name, description } in the voice.`);
  lines.push(`  • "name" follows the voice name pattern above. You MAY polish the scraped name if it breaks the voice (e.g. "Our Super Awesome Suite" → "Mountain Suite").`);
  lines.push(`  • "description" follows the voice description pattern above, ${ITEM_DESC_MAX_WORDS[voice.id]} words MAX for ${voice.id}.`);
  lines.push(`  • Each description names a specific practice, material, or constraint — not a benefit claim.`);
  lines.push(`  • Keep the order of candidates; do not drop entries unless a name is clearly not a real service.`);
  lines.push(``);

  if (voice.exampleHeadlines.length > 0) {
    lines.push(`Example headlines (reference only — do NOT reuse):`);
    for (const ex of voice.exampleHeadlines) {
      lines.push(`  • Bad: "${ex.bad}"`);
      lines.push(`    Good: "${ex.good}"`);
      lines.push(`    Why: ${ex.why}`);
    }
    lines.push(``);
  }

  if (voice.exampleBodyCopy.length > 0) {
    lines.push(`Example body copy (voice anchors — match the rhythm, not the content):`);
    for (const ex of voice.exampleBodyCopy) {
      lines.push(`  • [${ex.context}] ${ex.text}`);
    }
    lines.push(``);
  }

  if (override) {
    lines.push(`Style-specific override (patch on top of the base voice):`);
    lines.push(`  ${override}`);
    lines.push(``);
  }

  lines.push(`PRIORITY RULES (follow in this order):`);
  lines.push(`  1. ZERO banned words. If your output contains any item from the ban list, rewrite until it doesn't. This is the single most important rule.`);
  lines.push(`  2. Match the voice sentence rhythm. If fragment-heavy (V1, V5), write fragments. If long-sentence-allowed (V2, V7), use longer sentences. Do NOT hedge toward a generic middle.`);
  lines.push(`  3. The hero headline follows ONE of the voice's opening-line formulas, exactly.`);
  lines.push(`  4. Hero section uses at least one signature move.`);
  lines.push(`  5. CTAs come from the CTA bank verbatim, unless a common-sense industry label is warranted (then keep it in register).`);
  lines.push(`  6. Use specificity: the hero MUST contain at least one of — a number, a place name, a named material or technique, a specific practice. If the intake is thin, invent one that fits the industry (you may flag invented_specifics in the output).`);
  lines.push(`  7. No stock section headings ("Our Services," "About Us," "Why Choose Us"). Replace with voice-matched phrasing.`);
  lines.push(``);

  lines.push(`BEFORE RETURNING, self-check:`);
  lines.push(`  - Hero H1 matches a voice formula? If no, rewrite.`);
  lines.push(`  - hero.body is populated, within word budget, and carries distinct info (not a paraphrase of subheadline/tagline)? If no, rewrite.`);
  lines.push(`  - Any banned words anywhere in the output? If yes, rewrite those fields.`);
  lines.push(`  - Hero body uses "we believe" / "we strive" / "we're passionate"? If yes, rewrite.`);
  lines.push(`  - Hero contains an exclamation point? (Never, except V5 where enthusiasm is fragments not punctuation.) If yes, rewrite.`);
  lines.push(`  - Any section header reads as stock marketing ("Our Services," "About Us")? If yes, rewrite using voice patterns.`);
  lines.push(`  - Hero has at least one specific anchor (number, place, material, practice)? If no, invent one.`);
  lines.push(`  - services.items[] (if candidates were supplied): every description within word budget, in voice, naming a practice not a benefit? If any fail, rewrite those items only.`);

  return lines.join("\n");
}

// ─── Quality gates ──────────────────────────────────────────────────────

export type QualityGateFailure = {
  gate: "ban-word" | "length" | "specificity" | "redundancy";
  field: string;
  detail: string;
};

export type QualityGateResult = {
  passed: boolean;
  failures: QualityGateFailure[];
  voiceId: VoiceFamilyId;
};

/**
 * Generic shape of the refined copy this module validates. The generator
 * produces this schema today in copy-generator.mjs; we keep the gate
 * logic tolerant of extra fields and missing optional slots.
 */
export type RefinableCopy = {
  hero?: {
    kicker?: string;
    headline?: string;
    subheadline?: string;
    body?: string;
    ctaText?: string;
  };
  about?: {
    title?: string;
    subtitle?: string;
    paragraphs?: string[];
    mission?: string;
    vision?: string;
  };
  services?: {
    title?: string;
    subtitle?: string;
    items?: { name?: string; description?: string }[];
  };
  gallery?: { title?: string; subtitle?: string };
  testimonials?: { title?: string; subtitle?: string };
  contact?: { title?: string; subtitle?: string };
  tagline?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
};

/**
 * Run all quality gates against a generated copy object. Returns a list
 * of per-field failures. Never throws — the caller decides whether to
 * regenerate, warn, or ship.
 *
 * Gates implemented (from copy-refinement.md §Quality gates):
 *   - Ban-word scan (case-insensitive, substring match)
 *   - Length sanity check (hero H1; hero.body per HERO_BODY_MAX_WORDS;
 *     services.items[].description per ITEM_DESC_MAX_WORDS)
 *   - Specificity check (hero must contain a number, place, named material, or specific practice)
 *   - Redundancy scan (tagline / hero.subheadline / hero.body shouldn't paraphrase the same line)
 *
 * Deliberate non-gates:
 *   - about.paragraphs[] length is NOT checked against the voice budget —
 *     those paragraphs follow Kodagen's 40–80 word schema rule from
 *     copy-generator's RULES block, which is intentionally wider than
 *     the voice's hero-body budget. Gate-checking them would produce
 *     false positives.
 */
export function runQualityGates(copy: RefinableCopy, voice: VoiceFamily): QualityGateResult {
  const failures: QualityGateFailure[] = [];

  // --- Ban-word scan ---------------------------------------------------
  const scannedFields: Array<[string, string | undefined]> = [
    ["hero.headline", copy.hero?.headline],
    ["hero.subheadline", copy.hero?.subheadline],
    ["hero.body", copy.hero?.body],
    ["hero.ctaText", copy.hero?.ctaText],
    ["about.title", copy.about?.title],
    ["about.subtitle", copy.about?.subtitle],
    ["about.mission", copy.about?.mission],
    ["about.vision", copy.about?.vision],
    ["services.title", copy.services?.title],
    ["services.subtitle", copy.services?.subtitle],
    ["tagline", copy.tagline],
    ["seo.metaTitle", copy.seo?.metaTitle],
    ["seo.metaDescription", copy.seo?.metaDescription],
  ];
  // Index each about.paragraph separately so we can pinpoint the offender.
  for (let i = 0; i < (copy.about?.paragraphs?.length ?? 0); i++) {
    scannedFields.push([`about.paragraphs[${i}]`, copy.about?.paragraphs?.[i]]);
  }
  // Each services.items entry scanned individually (name + description).
  const items = copy.services?.items ?? [];
  for (let i = 0; i < items.length; i++) {
    scannedFields.push([`services.items[${i}].name`, items[i]?.name]);
    scannedFields.push([`services.items[${i}].description`, items[i]?.description]);
  }

  for (const [field, value] of scannedFields) {
    if (!value) continue;
    const hit = findBannedWord(value, voice.banList);
    if (hit) {
      failures.push({
        gate: "ban-word",
        field,
        detail: `contains banned phrase: "${hit}"`,
      });
    }
  }

  // --- Length check: headline -----------------------------------------
  const headline = copy.hero?.headline ?? "";
  const headlineWords = wordCount(headline);
  const headlineLimit = voice.id === "V7" ? 14 : 12;
  if (headline && headlineWords > headlineLimit) {
    failures.push({
      gate: "length",
      field: "hero.headline",
      detail: `${headlineWords} words > ${headlineLimit} allowed for ${voice.id}`,
    });
  }

  // --- Length check: hero.body (real field, not a proxy) --------------
  const heroBody = copy.hero?.body ?? "";
  const heroBodyWords = wordCount(heroBody);
  const heroBodyLimit = HERO_BODY_MAX_WORDS[voice.id];
  if (heroBody && heroBodyWords > heroBodyLimit) {
    failures.push({
      gate: "length",
      field: "hero.body",
      detail: `${heroBodyWords} words > ${heroBodyLimit} allowed for ${voice.id}`,
    });
  }

  // --- Length check: services.items[].description ---------------------
  const itemLimit = ITEM_DESC_MAX_WORDS[voice.id];
  for (let i = 0; i < items.length; i++) {
    const desc = items[i]?.description ?? "";
    const n = wordCount(desc);
    if (desc && n > itemLimit) {
      failures.push({
        gate: "length",
        field: `services.items[${i}].description`,
        detail: `${n} words > ${itemLimit} allowed for ${voice.id}`,
      });
    }
  }

  // --- Specificity check ----------------------------------------------
  const heroText = [
    copy.hero?.headline,
    copy.hero?.subheadline,
    copy.hero?.body,
  ].filter(Boolean).join(" ");
  if (heroText && !hasSpecificAnchor(heroText)) {
    failures.push({
      gate: "specificity",
      field: "hero",
      detail: "no number, year, proper-noun place, or named material found in hero block",
    });
  }

  // --- Redundancy scan ------------------------------------------------
  // Flag if tagline, hero.subheadline, and hero.body are all rewordings
  // of the same sentence (Jaccard overlap over tokens).
  const tagline = copy.tagline ?? "";
  const subhead = copy.hero?.subheadline ?? "";
  const heroBodyForOverlap = copy.hero?.body ?? "";

  const pairs: Array<[string, string, string, string]> = [
    ["tagline", "hero.subheadline", tagline, subhead],
    ["tagline", "hero.body", tagline, heroBodyForOverlap],
    ["hero.subheadline", "hero.body", subhead, heroBodyForOverlap],
  ];
  for (const [fa, fb, a, b] of pairs) {
    if (!a || !b) continue;
    const sim = jaccardSimilarity(a, b);
    if (sim >= 0.75) {
      failures.push({
        gate: "redundancy",
        field: `${fa} ↔ ${fb}`,
        detail: `token overlap ${sim.toFixed(2)} ≥ 0.75 — they carry the same information`,
      });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    voiceId: voice.id,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Return the first banned phrase found in `text`, or null. Case-insensitive substring. */
function findBannedWord(text: string, banList: string[]): string | null {
  const haystack = text.toLowerCase();
  for (const ban of banList) {
    const needle = ban.toLowerCase();
    // Literal punctuation bans (like "!" in V1/V7) are checked as substrings.
    if (haystack.includes(needle)) return ban;
  }
  return null;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Does the hero text contain at least one specificity anchor?
 *   - a digit (matches years, prices, quantities, counts)
 *   - a proper noun sequence of 2+ Capitalized words (likely a place/name/brand)
 *   - a hyphenated or compound technical term (matches things like
 *     "chronometer-grade steel," "post oak," "cold-brewed")
 */
function hasSpecificAnchor(text: string): boolean {
  if (/\d/.test(text)) return true;
  if (/\b[A-Z][a-z]+ [A-Z][a-z]+/.test(text)) return true;
  if (/\b[a-z]+-[a-z]+\b/.test(text)) return true;
  return false;
}

/** Tokenize to lowercase word set, stripping short stopwords. */
function tokenize(text: string): Set<string> {
  const stop = new Set([
    "the", "a", "an", "and", "or", "but", "of", "to", "for", "in", "on",
    "with", "at", "by", "is", "are", "be", "we", "our", "you", "your",
  ]);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w));
  return new Set(tokens);
}

/** Jaccard similarity over tokenized word sets. */
function jaccardSimilarity(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Human-readable summary of a gate result — logged by the generator when
 * refinement produces warnings.
 */
export function formatQualityGateReport(result: QualityGateResult): string {
  if (result.passed) return `✓ copy quality gates passed (${result.voiceId})`;
  const lines = [`⚠ copy quality gates failed (${result.voiceId}) — ${result.failures.length} issue(s):`];
  for (const f of result.failures) {
    lines.push(`    [${f.gate}] ${f.field}: ${f.detail}`);
  }
  return lines.join("\n");
}
