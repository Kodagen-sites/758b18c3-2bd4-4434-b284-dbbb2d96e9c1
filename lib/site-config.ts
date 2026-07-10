// lib/site-config.ts
//
// Lightweight helper for components that need to know the site's engine.
// Wraps the existing site-scope.ts / load-site-config.ts (which return more
// data than is needed for engine routing decisions).

import { getCurrentSite } from "@/lib/site-scope";

export type Engine = "booking" | "catalog" | "tickets" | "crm" | "none";

export type SiteConfig = {
  engine: Engine;
  site_id: string;
  slug: string;
  name: string;
  industry: string | null;
  status: string;
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const ctx = await getCurrentSite();
  if (!ctx || !ctx.site) {
    return {
      engine: "none",
      site_id: "",
      slug: "",
      name: "",
      industry: null,
      status: "draft",
    };
  }
  
  const config = ctx.site.config as Record<string, unknown> | undefined;
  const engine = (config?.engine as Engine) || "none";
  
  return {
    engine,
    site_id: ctx.site.id,
    slug: ctx.site.slug,
    name: ctx.site.name,
    industry: ctx.site.industry,
    status: ctx.site.status,
  };
}
