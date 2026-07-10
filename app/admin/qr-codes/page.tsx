import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import QRCodesView from "./qr-codes-view";

export const revalidate = 0;

export default async function QRCodesPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = createServiceClient();
  const [{ data: resources }, config, counts, h] = await Promise.all([
    withSchema(supabase, BOOKING_SCHEMA)
      .from("resources")
      .select("id, name, type, attributes")
      .eq(FK_COL, ctx.siteId)
      .eq("active", true)
      .order("sort_order"),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    headers(),
  ]);

  // Only rooms (not events)
  const rooms = (resources ?? [])
    .filter((r: any) => {
      const attrs = (r.attributes ?? {}) as Record<string, unknown>;
      return attrs.category !== "event";
    })
    .map((r: any) => ({
      id: r.id as string,
      name: (r.name as string) ?? "",
      type: (r.type as string) ?? "",
    }));

  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  return (
    <QRCodesView
      rooms={rooms}
      origin={origin}
      businessName={config?.businessName ?? "Hotel"}
      config={config}
      counts={counts}
    />
  );
}
