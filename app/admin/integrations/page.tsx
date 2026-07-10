import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import IntegrationsView, { type StoredIntegration } from "./integrations-view";


export const revalidate = 0;

export default async function IntegrationsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const [{ data: rows }, config, counts, h] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("integrations")
      .select("kind, display_name, config, enabled")
      .eq(FK_COL, ctx.siteId),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    headers(),
  ]);

  // Build a map of kind → stored row for the view to merge with the catalog.
  const stored: Record<string, StoredIntegration> = {};
  for (const r of rows ?? []) {
    stored[r.kind as string] = {
      kind: r.kind as string,
      display_name: (r.display_name as string | null) ?? "",
      enabled: Boolean(r.enabled),
      config: (r.config as Record<string, unknown> | null) ?? {},
    };
  }

  // Origin for displaying webhook URLs (Paystack/Stripe)
  const origin = (() => {
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("host") ?? "localhost:3000";
    return `${proto}://${host}`;
  })();

  return (
    <IntegrationsView
      config={config}
      counts={counts}
      stored={stored}
      origin={origin}
    />
  );
}
