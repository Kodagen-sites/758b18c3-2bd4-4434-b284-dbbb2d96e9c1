// lib/site-content.ts — public CMS read layer.
//
// The admin Content pages write the canonical CMS shape into
// kodagen.sites.config (see app/admin/_actions/site-config.ts) and identity
// fields into kodagen.site_settings. Public pages render THROUGH this loader
// so those edits appear on the live site: take the CMS value when present and
// fall back to the page's static copy when not.
//
//   const cms = await getSiteContent();
//   const headline = cms?.hero?.headline || siteConfig.hero.title;
//
// Shared (Kodagen DB2) mode reads via the anon-granted `get_public_site`
// SECURITY DEFINER RPC (migration 010) with a plain anon client — no cookies,
// so statically rendered pages stay static; saves revalidate them on demand.
// Every failure path returns null: the public site must never break because
// the CMS read did.

import { cache } from "react";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { DB_MODE, KODAGEN_SCHEMA } from "@/lib/db-scope";

export type CmsServiceItem = {
  name?: string;
  description?: string;
  price?: string;
  icon?: string;
  image?: string;
};

export type CmsContent = {
  businessName?: string;
  tagline?: string;
  logo?: { path?: string; alt?: string } | null;
  hero?: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
  };
  about?: { title?: string; mission?: string; vision?: string; paragraphs?: string[] };
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    hours?: string;
  };
  services?: { title?: string; subtitle?: string; items?: CmsServiceItem[] };
  footer?: { statement?: string };
  social?: Record<string, string>;
  /** Raw copy-hub overrides keyed by copy_key (e.g. "hero.headline"). */
  copy?: Record<string, string>;
  [key: string]: unknown;
};

const SLUG = process.env.NEXT_PUBLIC_SITE_SLUG ?? "";

/**
 * The site's live CMS content, or null when unavailable (build preview before
 * provisioning, dedicated mode, network failure). Callers must always keep
 * their static copy as the fallback.
 */
export const getSiteContent = cache(async (): Promise<CmsContent | null> => {
  try {
    // Dedicated mode has no kodagen.sites directory; its CMS lane (site_settings
    // via the service key) is separate — static copy stays authoritative there.
    if (DB_MODE !== "shared") return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || !SLUG) return null;

    const supabase = createAnonClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase
      .schema(KODAGEN_SCHEMA ?? "kodagen")
      .rpc("get_public_site", { p_slug: SLUG });
    const s = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined;
    if (!s) return null;

    const cfg = ((s.config ?? {}) as CmsContent) ?? {};

    // site_settings identity fields win over the config blob when present —
    // they are what /admin/content/settings edits.
    if (typeof s.business_name === "string" && s.business_name) cfg.businessName = s.business_name;
    if (typeof s.tagline_short === "string" && s.tagline_short) cfg.tagline = s.tagline_short;
    cfg.contact = {
      ...(cfg.contact ?? {}),
      ...(typeof s.primary_phone === "string" && s.primary_phone ? { phone: s.primary_phone } : {}),
      ...(typeof s.primary_email === "string" && s.primary_email ? { email: s.primary_email } : {}),
    };

    // Copy-hub overrides (kodagen.site_copy_overrides via migration 011) are the
    // owner's newest words for these surfaces — they win over everything.
    const copy = (s.copy_overrides ?? {}) as Record<string, string>;
    cfg.copy = copy;
    if (copy["hero.headline"]) cfg.hero = { ...(cfg.hero ?? {}), headline: copy["hero.headline"] };
    if (copy["hero.subhead"]) cfg.hero = { ...(cfg.hero ?? {}), subheadline: copy["hero.subhead"] };
    if (copy["about.narrative"]) {
      cfg.about = { ...(cfg.about ?? {}), paragraphs: [copy["about.narrative"]] };
    }
    if (copy["footer.statement"]) cfg.footer = { ...(cfg.footer ?? {}), statement: copy["footer.statement"] };
    if (copy["cta.primary"]) cfg.hero = { ...(cfg.hero ?? {}), ctaText: copy["cta.primary"] };
    return cfg;
  } catch {
    return null;
  }
});
