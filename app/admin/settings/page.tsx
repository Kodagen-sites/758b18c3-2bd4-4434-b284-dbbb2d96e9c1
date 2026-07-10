import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import SettingsView from "./settings-view";


export default async function SettingsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const [{ data }, siteConfig, counts] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("sites")
      .select("name, slug, domain, industry, theme, config")
      .eq("id", ctx.siteId)
      .single(),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  return (
    <SettingsView
      site={{
        name:    data?.name ?? "",
        slug:    data?.slug ?? "",
        domain:  data?.domain ?? "",
        industry: data?.industry ?? "",
      }}
      theme={(data?.theme ?? {}) as Record<string, unknown>}
      config={(data?.config ?? {}) as Record<string, unknown>}
      siteConfig={siteConfig}
      counts={counts}
    />
  );
}
