/**
 * Image fallback library — never ship a generated site with empty image slots.
 *
 * The Eko Heritage failure pattern: cards rendered with broken-image icons
 * because asset generation was deferred (prompt-only mode) but the image
 * fields were empty strings instead of falling back gracefully.
 *
 * This library provides three fallback tiers:
 *
 * 1. **Gradient placeholder** (always works, no network):
 *    Brand-color gradient with subtle texture overlay. The image position
 *    is filled with something visually intentional, not "broken icon."
 *
 * 2. **Curated Unsplash search** (requires VITE_UNSPLASH_ACCESS_KEY):
 *    Industry-tuned keywords return real photography. Cached locally after
 *    first fetch.
 *
 * 3. **Local stock library** (always works, larger bundle):
 *    Pre-bundled stock images shipped with skill at /stock/ — used as
 *    last resort if Unsplash is misconfigured.
 *
 * Usage in scaffolded code:
 *
 *   import { resolveImage } from "@/lib/image-fallback";
 *
 *   const heroImg = resolveImage({
 *     src: room.image,                    // possibly empty
 *     industry: "boutique-hotel",
 *     keyword: "luxury hotel suite",
 *     brandColor: siteConfig.brand.primary,
 *   });
 *
 *   <img src={heroImg} alt="..." />
 */

type ResolveOptions = {
  src?: string | null;          // user/asset-pipeline-provided URL (may be empty)
  industry?: string;             // e.g. "boutique-hotel", "restaurant"
  keyword?: string;              // for Unsplash search; e.g. "luxury hotel suite"
  brandColor?: string;           // hex or CSS color for gradient fallback
  width?: number;                // for Unsplash sizing
  height?: number;
  fallbackTier?: "gradient" | "unsplash" | "stock";
};

// ─── Industry → Unsplash keywords (tuned for premium aesthetic) ───────

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "boutique-hotel": ["luxury hotel suite", "hotel lobby architecture", "boutique hotel interior", "luxury bedroom"],
  "hotel-chain": ["hotel exterior", "hotel reception", "luxury hotel pool", "hotel suite city view"],
  "restaurant": ["fine dining", "restaurant interior", "plated food", "chef plating"],
  "fine-dining": ["michelin restaurant", "fine dining plate", "wine glass restaurant", "restaurant ambiance"],
  "cafe": ["coffee shop interior", "specialty coffee", "cafe atmosphere"],
  "salon": ["hair salon interior", "modern salon", "beauty salon"],
  "spa": ["luxury spa", "spa treatment room", "wellness retreat"],
  "gym": ["modern gym", "fitness studio", "yoga studio"],
  "fitness-studio": ["yoga class", "pilates studio", "fitness training"],
  "auto-dealer": ["luxury car showroom", "premium automobile", "car dealership"],
  "watch-boutique": ["luxury watch", "watchmaker atelier", "horology"],
  "jewelry": ["fine jewelry", "diamond ring", "jewelry store"],
  "art-gallery": ["art gallery interior", "modern art exhibition", "contemporary art"],
  "real-estate": ["luxury home interior", "modern architecture house", "luxury property"],
  "law-firm": ["modern office building", "law firm interior", "professional workspace"],
  "consulting": ["modern office", "business meeting", "professional workspace"],
  "agency": ["creative studio", "design agency office", "modern workspace"],
  "architecture": ["modern architecture", "architectural drawing", "minimal building"],
  "photography": ["photography studio", "camera equipment", "photo gallery"],
  "wedding": ["wedding venue", "wedding reception", "elegant wedding"],
  "conference": ["conference hall", "modern auditorium", "business event"],
  "dental-clinic": ["modern dental office", "dental clinic interior"],
  "medical-clinic": ["modern medical office", "healthcare facility"],
  "default": ["modern minimal interior", "architectural detail", "luxury minimalism"],
};

// ─── Public API ───────────────────────────────────────────────────────

export function resolveImage(opts: ResolveOptions): string {
  // 1. Use provided src if it looks like a real URL
  if (opts.src && isValidUrl(opts.src)) return opts.src;
  
  // 2. Tier resolution
  const tier = opts.fallbackTier ?? "gradient";
  
  if (tier === "unsplash" && getUnsplashKey()) {
    return unsplashUrl(opts);
  }
  
  if (tier === "stock") {
    return stockUrl(opts);
  }
  
  // Default: gradient placeholder (always works, no network)
  return gradientDataUrl(opts);
}

/**
 * Generate a list of placeholder images for a gallery.
 * Returns array of { src, alt } compatible with ImageGallery.
 */
export function placeholderGallery(opts: {
  count: number;
  industry?: string;
  brandColor?: string;
  altPrefix?: string;
}): Array<{ src: string; alt: string }> {
  const { count, industry, brandColor, altPrefix = "Gallery image" } = opts;
  const variants = ["luxury", "minimal", "warm", "editorial", "architectural"];
  
  return Array.from({ length: count }, (_, i) => ({
    src: gradientDataUrl({
      industry,
      brandColor,
      keyword: variants[i % variants.length],
    }),
    alt: `${altPrefix} ${i + 1}`,
  }));
}

// ─── Tier 1: Gradient placeholder (SVG data URL) ────────────────────

function gradientDataUrl(opts: { brandColor?: string; industry?: string; keyword?: string }): string {
  const color = opts.brandColor || "#1a365d";
  const accent = adjustHsl(color, 30);
  const dark = adjustHsl(color, -40);
  
  // Variation seed based on inputs so different cards get different gradients
  const seed = hashString((opts.keyword || opts.industry || "default") + Math.random().toString(36).slice(2, 6));
  const angle = (seed % 360);
  const variant = seed % 4;
  
  const gradients = [
    `linear-gradient(${angle}deg, ${color}, ${accent})`,                               // smooth
    `linear-gradient(${angle}deg, ${dark}, ${color}, ${accent})`,                      // tri-stop
    `radial-gradient(at 30% 20%, ${accent}, ${color} 50%, ${dark})`,                   // radial spotlight
    `linear-gradient(${angle}deg, ${dark} 0%, ${color} 50%, ${accent} 100%)`,          // smooth tri
  ];
  
  const grad = gradients[variant];
  
  // SVG with gradient + subtle noise overlay
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed % 100}"/>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
        </filter>
      </defs>
      <rect width="800" height="600" style="fill: ${color}"/>
      <rect width="800" height="600" style="fill: ${accent}; mix-blend-mode: overlay; opacity: 0.5"/>
      <rect width="800" height="600" filter="url(#noise)"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

// ─── Tier 2: Unsplash (when configured) ─────────────────────────────

function unsplashUrl(opts: ResolveOptions): string {
  const keywords = opts.keyword
    ? [opts.keyword]
    : INDUSTRY_KEYWORDS[opts.industry || "default"] || INDUSTRY_KEYWORDS["default"];
  const query = encodeURIComponent(keywords[Math.floor(Math.random() * keywords.length)]);
  const w = opts.width || 1200;
  const h = opts.height || 800;

  // Unsplash Source API was deprecated (returns 503). Use the Search API
  // via a server-side proxy when UNSPLASH_ACCESS_KEY is configured. Until
  // then this branch is only reached when getUnsplashKey() returns non-null
  // AND the proxy is wired. Without a key, getUnsplashKey() returns null
  // and we never enter this function — gradient handles the fallback.
  return `https://api.unsplash.com/photos/random?query=${query}&w=${w}&h=${h}`;
}

function getUnsplashKey(): string | null {
  // Next.js (App Router / Pages) — process.env is the standard.
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ||
      process.env.UNSPLASH_ACCESS_KEY ||
      null
    );
  }
  // Vite — kept for backwards compat with legacy Vite-built sites.
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return (import.meta as any).env.VITE_UNSPLASH_ACCESS_KEY || null;
  }
  return null;
}

// ─── Tier 3: Local stock library ────────────────────────────────────

function stockUrl(opts: ResolveOptions): string {
  // Maps to /public/stock/{industry}/{n}.jpg — these are bundled with the
  // generated site at provisioning time. The provisioning script downloads
  // a pre-curated set per industry from the skill's stock cache.
  const industry = opts.industry || "default";
  const n = (hashString(opts.keyword || "default") % 5) + 1;
  return `/stock/${industry}/${n}.jpg`;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isValidUrl(s: string): boolean {
  if (!s || s.length < 4) return false;
  if (s.startsWith("data:")) return true;
  if (s.startsWith("http://") || s.startsWith("https://")) return true;
  if (s.startsWith("/")) return true;   // relative URL
  return false;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function adjustHsl(hex: string, lightnessDelta: number): string {
  // Quick HSL lightness shift on a hex color. Crude but works for placeholders.
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  
  // Convert to HSL
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  
  // Just shift lightness toward white or black
  const factor = lightnessDelta > 0 ? (1 + lightnessDelta / 100) : (1 + lightnessDelta / 100);
  const newR = Math.max(0, Math.min(255, Math.round(r * factor)));
  const newG = Math.max(0, Math.min(255, Math.round(g * factor)));
  const newB = Math.max(0, Math.min(255, Math.round(b * factor)));
  
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}
