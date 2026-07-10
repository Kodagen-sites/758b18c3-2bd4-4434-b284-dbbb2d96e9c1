// lib/brand.ts
//
// Brand info for /account/* layouts (logo, colors, taglines, contact email).
// Wraps the same site-scope context but exposes the brand-specific subset.

import { getCurrentSite } from "@/lib/site-scope";

export type Brand = {
  name: string;
  logo: string | null;
  favicon: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  tagline: string | null;
  account_blurb: string | null;
  signup_blurb: string | null;
  contact_email: string | null;
};

export async function getBrand(): Promise<Brand> {
  const ctx = await getCurrentSite();
  
  // Default fallback when no site context (during signup/login of a new user before site mapping)
  const defaults: Brand = {
    name: "Site",
    logo: null,
    favicon: null,
    primary_color: "#000000",
    secondary_color: "#666666",
    font_family: "system-ui, sans-serif",
    tagline: null,
    account_blurb: null,
    signup_blurb: null,
    contact_email: null,
  };
  
  if (!ctx || !ctx.site) return defaults;
  
  const config = (ctx.site.config ?? {}) as Record<string, unknown>;
  const brand = (config.brand ?? {}) as Record<string, unknown>;
  
  return {
    name: ctx.site.name || defaults.name,
    logo: (brand.logo as string) || null,
    favicon: (brand.favicon as string) || null,
    primary_color: (brand.primary_color as string) || defaults.primary_color,
    secondary_color: (brand.secondary_color as string) || defaults.secondary_color,
    font_family: (brand.font_family as string) || defaults.font_family,
    tagline: (brand.tagline as string) || null,
    account_blurb: (brand.account_blurb as string) || null,
    signup_blurb: (brand.signup_blurb as string) || null,
    contact_email: (brand.contact_email as string) || null,
  };
}
