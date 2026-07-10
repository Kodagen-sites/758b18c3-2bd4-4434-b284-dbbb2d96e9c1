import { FK_COL, DB_MODE, KODAGEN_SCHEMA, BOOKING_SCHEMA, getScopeId, withSchema } from '@/lib/db-scope';
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { services } from "@kodagen/booking-engine";
import type { SiteConfig } from "@/lib/types";
import { fmtMoney } from "@/lib/currency";
import { siteConfig as bakedContent } from "@/content/site-config";

/**
 * Admin-facing loader. Always resolves to a usable SiteConfig: when the DB has
 * no row yet (sparse/first-run provisioning) it falls back to the baked
 * content config so admin pages always render.
 */
export async function loadSiteConfigFromDB(slug: string): Promise<SiteConfig> {
  return (await loadSiteConfigFromDBRaw(slug)) ?? bakedFallbackConfig();
}

function bakedFallbackConfig(): SiteConfig {
  return {
    templateId: "hospitality-v1",
    slug: process.env.NEXT_PUBLIC_SITE_SLUG ?? "",
    businessName: bakedContent.company.name,
    tagline: bakedContent.tagline ?? "",
    theme: {
      primaryColor: bakedContent.brand.primary,
      secondaryColor: "#f0ece1",
      accentColor: bakedContent.brand.accent,
      fontHeading: bakedContent.typography.display,
      fontBody: bakedContent.typography.body,
      style: "elegant",
    },
    logo: null,
    favicon: undefined,
    hero: { headline: "", subheadline: "", ctaText: "", ctaLink: "", backgroundImage: "", overlayOpacity: 0.5 },
    about: { title: "", paragraphs: [], mission: "", vision: "", image: "" },
    services: { title: "", subtitle: "", items: [] },
    gallery: { title: "", subtitle: "", images: [] },
    testimonials: [],
    contact: { title: "", subtitle: "", address: "", phone: "", email: "", hours: "", googleMapsEmbed: "", formEnabled: true },
    socialLinks: [],
    footer: { copyrightText: `© ${new Date().getFullYear()} ${bakedContent.company.name}. All rights reserved.`, additionalLinks: undefined },
    seo: { metaTitle: "", metaDescription: "", keywords: [] },
  };
}

/**
 * Build a complete SiteConfig from the database.
 *
 * Shared mode:  resolves via slug → kodagen.sites → config blob
 * Dedicated mode: resolves via NEXT_PUBLIC_TENANT_ID → site_settings row
 *
 * The `slug` parameter is only used in shared mode. In dedicated mode it is
 * ignored — pass `process.env.NEXT_PUBLIC_SITE_SLUG ?? ''` for compat.
 */
async function loadSiteConfigFromDBRaw(slug: string): Promise<SiteConfig | null> {
  if (DB_MODE === "dedicated") {
    return loadSiteConfigDedicated(createServiceClient());
  }

  // ── Shared mode (Kodagen DB2) ────────────────────────────────────────────
  // Authenticated cookie client: admin callers read via the member RLS policies
  // (migration 010); public/anon callers get no rows and the caller falls back
  // to baked siteConfig. No service key is shipped in shared mode.
  const supabase = await createClient();

  const { data: site } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("sites")
    .select("id, slug, name, industry, status, config, theme")
    .eq("slug", slug)
    .maybeSingle();

  if (!site) return null;

  const cfg = (site.config ?? {}) as Record<string, unknown>;
  const theme = (site.theme ?? {}) as Record<string, unknown>;

  const get = (o: Record<string, unknown> | undefined, ...keys: string[]): string => {
    let cur: unknown = o;
    for (const k of keys) cur = (cur as Record<string, unknown> | undefined)?.[k];
    return typeof cur === "string" ? cur : "";
  };
  const getArr = (o: Record<string, unknown> | undefined, ...keys: string[]): string[] => {
    let cur: unknown = o;
    for (const k of keys) cur = (cur as Record<string, unknown> | undefined)?.[k];
    return Array.isArray(cur) ? (cur as string[]) : [];
  };

  // Pull rooms (resources), testimonials, gallery (media)
  const [resources, testimonialsResult, mediaResult] = await Promise.all([
    services.listResources(supabase, site.id, { active_only: true }),
    withSchema(supabase, KODAGEN_SCHEMA).from("testimonials")
      .select("author_name, author_role, body, rating")
      .eq(FK_COL, site.id).eq("active", true).order("sort_order"),
    withSchema(supabase, KODAGEN_SCHEMA).from("media")
      .select("storage_path, alt, filename")
      .eq(FK_COL, site.id).order("created_at", { ascending: false }).limit(40),
  ]);

  // Group resources → service items (one per room type)
  const byType = new Map<string, typeof resources>();
  for (const r of resources) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type)!.push(r);
  }
  const roomServiceItems = Array.from(byType.entries()).map(([type, items]) => {
    const sample = items[0];
    const attrs = (sample.attributes ?? {}) as Record<string, unknown>;
    return {
      name: type,
      description: sample.description ?? "",
      price: `From ${fmtMoney(Math.round(sample.base_price_cents / 100))}/night`,
      icon: "bed",
      image: typeof attrs.image === "string" ? attrs.image : undefined,
    };
  });

  // Non-bookable amenities (pool, restaurant, conference, etc.) live in
  // sites.config.servicesExtras and are merged after the bookable rooms.
  type ServiceItem = { name: string; description: string; price?: string; icon?: string; image?: string };
  const extrasRaw = Array.isArray(cfg.servicesExtras) ? (cfg.servicesExtras as unknown[]) : [];
  const servicesExtras: ServiceItem[] = extrasRaw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      name: typeof x.name === "string" ? x.name : "",
      description: typeof x.description === "string" ? x.description : "",
      price: typeof x.price === "string" ? x.price : undefined,
      icon: typeof x.icon === "string" ? x.icon : undefined,
      image: typeof x.image === "string" ? x.image : undefined,
    }))
    .filter((x) => x.name);

  const serviceItems = [...roomServiceItems, ...servicesExtras];

  const testimonials = (testimonialsResult.data ?? []).map((t: { author_name: string; author_role: string | null; body: string; rating: number | null }) => ({
    name: t.author_name,
    role: t.author_role ?? "",
    text: t.body,
    rating: t.rating ?? 5,
  }));

  const gallery = (mediaResult.data ?? []).map((m: { storage_path: string; alt: string | null; filename: string }) => {
    // External URL stored directly in storage_path? Use as-is.
    const isExternal = m.storage_path.startsWith("http");
    const url = isExternal
      ? m.storage_path
      : supabase.storage.from("site-assets").getPublicUrl(m.storage_path).data.publicUrl;
    // We only have one human-readable label per media row (`alt`). Use it for
    // accessibility (alt attribute) only — leave caption undefined so the
    // gallery doesn't render the same string twice (once as alt fallback,
    // once as the visible caption).
    return {
      src: url,
      alt: m.alt ?? m.filename,
      caption: undefined,
    };
  });

  // Build the SiteConfig blob the existing template components expect.
  return {
    templateId: (get(cfg, "templateId") || templateIdForIndustry(site.industry as string | null)) as SiteConfig["templateId"],
    slug: site.slug as string,
    businessName: get(cfg, "businessName") || (site.name as string),
    tagline: get(cfg, "tagline"),
    theme: {
      primaryColor: get(theme, "primaryColor") || "#0e2920",
      secondaryColor: get(theme, "secondaryColor") || "#f0ece1",
      accentColor: get(theme, "accentColor") || "#d8ff3e",
      fontHeading: get(theme, "fontHeading") || "system-ui, sans-serif",
      fontBody: get(theme, "fontBody") || "system-ui, sans-serif",
      style: ((typeof theme.style === "string" ? theme.style : "elegant") as "modern" | "classic" | "bold" | "elegant"),
    },
    logo: (() => {
      const l = cfg.logo as { path?: string; alt?: string } | string | null | undefined;
      if (!l) return null;
      if (typeof l === "string") return l ? { path: l, alt: get(cfg, "businessName") } : null;
      return l.path ? { path: l.path, alt: l.alt ?? get(cfg, "businessName") } : null;
    })(),
    favicon: get(cfg, "favicon") || undefined,
    hero: {
      headline:        get(cfg, "hero", "headline"),
      subheadline:     get(cfg, "hero", "subheadline"),
      ctaText:         get(cfg, "hero", "ctaText"),
      ctaLink:         get(cfg, "hero", "ctaLink"),
      backgroundImage: get(cfg, "hero", "backgroundImage"),
      overlayOpacity: typeof (cfg.hero as { overlayOpacity?: number } | undefined)?.overlayOpacity === "number"
        ? (cfg.hero as { overlayOpacity: number }).overlayOpacity
        : 0.5,
    },
    about: {
      title:      get(cfg, "about", "title"),
      paragraphs: getArr(cfg, "about", "paragraphs"),
      mission:    get(cfg, "about", "mission"),
      vision:     get(cfg, "about", "vision"),
      image:      get(cfg, "hero", "backgroundImage"),
    },
    services: {
      title:    get(cfg, "services", "title")    || (site.industry === "fashion" ? "Our Collections" : "Our Rooms & Suites"),
      subtitle: get(cfg, "services", "subtitle") || (site.industry === "fashion" ? "Curated styles for every occasion." : "Hand-picked for every kind of stay."),
      items: (serviceItems.length > 0 ? serviceItems : [{ name: "Coming soon", description: "Add room types in /admin/rooms.", icon: "bed" }]) as SiteConfig["services"]["items"],
    },
    gallery: {
      title:    get(cfg, "gallery", "title")    || "See Our World",
      subtitle: get(cfg, "gallery", "subtitle") || "A glimpse into the experience.",
      images: gallery.length > 0 ? gallery : [{ src: get(cfg, "hero", "backgroundImage"), alt: get(cfg, "businessName") }],
    },
    testimonials: testimonials.length > 0 ? testimonials : [],
    contact: {
      title:           get(cfg, "contact", "title"),
      subtitle:        get(cfg, "contact", "subtitle"),
      address:         get(cfg, "contact", "address"),
      phone:           get(cfg, "contact", "phone"),
      email:           get(cfg, "contact", "email"),
      hours:           get(cfg, "contact", "hours"),
      googleMapsEmbed: get(cfg, "contact", "googleMapsEmbed"),
      formEnabled: true,
    },
    socialLinks: Array.isArray(cfg.socialLinks) ? (cfg.socialLinks as { platform: "instagram" | "facebook" | "twitter" | "tiktok" | "whatsapp" | "messenger"; url: string }[]) : [],
    footer: {
      copyrightText: get(cfg, "footer", "copyrightText") || `© ${new Date().getFullYear()} ${site.name}. All rights reserved.`,
      additionalLinks: Array.isArray((cfg.footer as { additionalLinks?: unknown[] } | undefined)?.additionalLinks)
        ? ((cfg.footer as { additionalLinks: { label: string; url: string }[] }).additionalLinks)
        : undefined,
    },
    seo: {
      metaTitle:       get(cfg, "seo", "metaTitle"),
      metaDescription: get(cfg, "seo", "metaDescription"),
      keywords:        getArr(cfg, "seo", "keywords"),
    },
  };
}

// When the site's config blob carries no templateId (sparse provisioning),
// derive one from the industry so getIndustryModule resolves the right admin
// module. A construction/consulting site must never fall back to a hotel
// admin (Rooms/Occupancy/Security) — unknown industries resolve to "" which
// getIndustryModule maps to the generic appointments module.
const TEMPLATE_ID_BY_INDUSTRY: Record<string, string> = {
  fashion: "fashion-v1",
  construction: "construction-v1",
  realestate: "realestate-v1",
  "real-estate": "realestate-v1",
  insurance: "insurance-v1",
  security: "security-v1",
  oilgas: "oilgas-v1",
  "oil-gas": "oilgas-v1",
  hospitality: "hospitality-v1",
  hotel: "hospitality-v1",
  travel: "travel-v1",
  restaurant: "restaurant-v1",
  aviation: "aviation-v1",
  auto: "auto-v1",
  automotive: "auto-v1",
  pharmacy: "pharmacy-v1",
  agriculture: "agriculture-v1",
  interior: "interior-v1",
  logistics: "logistics-v1",
  tech: "tech-v1",
  events: "events-v1",
  church: "church-v1",
  professional: "professional-v1",
  fitness: "fitness-v1",
  beauty: "beauty-v1",
  law: "law-v1",
  education: "education-v1",
  medical: "medical-v1",
  clinic: "medical-v1",
  cleaning: "cleaning-v1",
  consulting: "consulting-v1",
};

function templateIdForIndustry(industry: string | null | undefined): string {
  return TEMPLATE_ID_BY_INDUSTRY[String(industry ?? "").trim().toLowerCase()] ?? "";
}

// ── Dedicated mode: read from site_settings + engine tables ─────────────────

async function loadSiteConfigDedicated(supabase: ReturnType<typeof createServiceClient>): Promise<SiteConfig | null> {
  const scopeId = await getScopeId(supabase);
  if (!scopeId) return null;

  const [settingsRes, testimonialsRes] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA).from("site_settings").select("*").eq(FK_COL, scopeId).maybeSingle(),
    supabase.from("testimonials")
      .select("author_name, author_role, quote, rating")
      .eq(FK_COL, scopeId).eq("is_approved", true).order("sort_order"),
  ]);

  const s = settingsRes.data;
  if (!s) return null;

  const testimonials = (testimonialsRes.data ?? []).map((t) => ({
    name:   t.author_name as string,
    role:   (t.author_role as string | null) ?? "",
    text:   (t.quote as string),
    rating: (t.rating as number | null) ?? 5,
  }));

  const businessName = (s.business_name as string) || "My Business";

  return {
    templateId:   ((s.template_id as string | null) ?? "hospitality-v1") as SiteConfig["templateId"],
    slug:         process.env.NEXT_PUBLIC_SITE_SLUG ?? "",
    businessName,
    tagline:      (s.tagline_short as string | null) ?? "",
    theme: {
      primaryColor:   (s.primary_color   as string | null) ?? "#0e2920",
      secondaryColor: (s.secondary_color as string | null) ?? "#f0ece1",
      accentColor:    (s.accent_color    as string | null) ?? "#d8ff3e",
      fontHeading:    (s.font_heading    as string | null) ?? "system-ui, sans-serif",
      fontBody:       (s.font_body       as string | null) ?? "system-ui, sans-serif",
      style: ((s.theme_style as string | null) ?? "elegant") as "modern" | "classic" | "bold" | "elegant",
    },
    logo:    null,
    favicon: undefined,
    hero: {
      headline:        (s.hero_headline    as string | null) ?? "",
      subheadline:     (s.hero_subhead     as string | null) ?? "",
      ctaText:         (s.primary_cta_label as string | null) ?? "Get in touch",
      ctaLink:         (s.primary_cta_href  as string | null) ?? "/contact",
      backgroundImage: (s.hero_image_url   as string | null) ?? "",
      overlayOpacity:  0.5,
    },
    about: {
      title:      "About Us",
      paragraphs: s.brand_narrative ? [s.brand_narrative as string] : [],
      mission:    "",
      vision:     "",
      image:      (s.hero_image_url as string | null) ?? "",
    },
    services: {
      title:    "Our Services",
      subtitle: "",
      items:    [],
    },
    gallery: {
      title:    "Gallery",
      subtitle: "",
      images:   [],
    },
    testimonials,
    contact: {
      title:    "Contact",
      subtitle: "",
      address:  "",
      phone:    (s.primary_phone as string | null) ?? "",
      email:    (s.primary_email as string | null) ?? "",
      hours:    "",
      formEnabled: true,
    },
    socialLinks: [],
    footer: {
      copyrightText: `© ${new Date().getFullYear()} ${businessName}. All rights reserved.`,
    },
    seo: {
      metaTitle:       (s.default_meta_title       as string | null) ?? businessName,
      metaDescription: (s.default_meta_description as string | null) ?? "",
      keywords:        [],
    },
  };
}
