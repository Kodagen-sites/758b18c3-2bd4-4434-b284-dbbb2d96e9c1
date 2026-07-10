import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import EventsView, { type AdminEvent } from "./events-view";
import { CURRENCY_CODE } from "@/lib/currency";

export const revalidate = 0;

export default async function EventsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = createServiceClient();
  const [{ data: rows }, config, counts] = await Promise.all([
    withSchema(supabase, BOOKING_SCHEMA)
      .from("resources")
      .select("id, type, name, description, base_price_cents, currency, active, attributes, created_at")
      .eq(FK_COL, ctx.siteId)
      .order("sort_order")
      .order("created_at", { ascending: false }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  // Filter to only events (category = "event" in attributes)
  const events: AdminEvent[] = (rows ?? [])
    .filter((r: any) => {
      const attrs = (r.attributes ?? {}) as Record<string, unknown>;
      return attrs.category === "event";
    })
    .map((r: any) => {
      const attrs = (r.attributes ?? {}) as Record<string, unknown>;
      return {
        id: r.id as string,
        name: r.name as string,
        description: (r.description as string) ?? "",
        price: Math.round((r.base_price_cents as number) / 100),
        currency: (r.currency as string) ?? CURRENCY_CODE,
        image: typeof attrs.image === "string" ? attrs.image : "",
        duration: typeof attrs.duration === "string" ? attrs.duration : "",
        capacity: typeof attrs.capacity === "string" ? attrs.capacity : "",
        active: Boolean(r.active),
        createdAt: r.created_at as string,
      };
    });

  return <EventsView events={events} config={config} counts={counts} />;
}
