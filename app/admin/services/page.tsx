import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { services } from "@kodagen/booking-engine";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import ServicesView, { type ServiceRow } from "./services-view";

export default async function ServicesPage() {
  const ctx = await getCurrentSite();
  if (!ctx?.site) redirect("/admin/login");

  const supabase = createServiceClient();
  const [allResources, upcoming, config, counts] = await Promise.all([
    services.listResources(supabase, ctx.siteId),
    services.listBookings(supabase, ctx.siteId, { limit: 500 }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);
  if (!config) redirect("/admin/login");

  // Events are managed in /admin/events — everything else is a bookable service.
  const resources = allResources.filter((r) => {
    const attrs = (r.attributes ?? {}) as Record<string, unknown>;
    return attrs.category !== "event";
  });

  // Upcoming appointment count per resource id (pending/confirmed/active, future end)
  const now = Date.now();
  const upcomingByResource = new Map<string, number>();
  for (const b of upcoming) {
    if (!["pending", "confirmed", "active"].includes(b.state)) continue;
    if (new Date(b.end_at).getTime() < now) continue;
    upcomingByResource.set(b.resource_id, (upcomingByResource.get(b.resource_id) ?? 0) + 1);
  }

  // Group slots by type → one ServiceRow per service.
  const byType = new Map<string, typeof resources>();
  for (const r of resources) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type)!.push(r);
  }

  const rows: ServiceRow[] = Array.from(byType.entries()).map(([type, slots]) => {
    const sample = slots[0];
    const attrs = (sample.attributes ?? {}) as Record<string, unknown>;
    return {
      name: type,
      description: sample.description ?? "",
      price: Math.round((sample.base_price_cents ?? 0)) / 100,
      durationMinutes: Number(attrs.duration_minutes ?? 0) || 0,
      capacity: slots.length,
      active: slots.some((s) => s.active),
      image: typeof attrs.image === "string" ? attrs.image : "",
      upcoming: slots.reduce((n, s) => n + (upcomingByResource.get(s.id) ?? 0), 0),
    };
  });

  return <ServicesView config={config} counts={counts} services={rows} />;
}
