import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { services } from "@kodagen/booking-engine";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import type { RoomType, Room } from "@/data/mock-rooms";
import RoomsView from "./rooms-view";


// Placeholder cover images per room type — until customer uploads their own.
const COVERS = [
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
];

export default async function RoomsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const now = new Date().toISOString();
  const [allResources, activeBookings, confirmedBookings, customers, config, counts] = await Promise.all([
    services.listResources(supabase, ctx.siteId),
    services.listBookings(supabase, ctx.siteId, { state: "active" }),
    // ALL confirmed bookings whose stay overlaps today (not just next 24h)
    services.listBookings(supabase, ctx.siteId, { state: "confirmed" }),
    services.listCustomers(supabase, ctx.siteId, { limit: 500 }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  // Exclude event resources — those are managed in /admin/events
  const resources = allResources.filter((r) => {
    const attrs = (r.attributes ?? {}) as Record<string, unknown>;
    return attrs.category !== "event";
  });

  const customerById = new Map(customers.map((c) => [c.id, c]));

  // Only count confirmed bookings whose dates overlap NOW (guest hasn't arrived but room is held)
  const reservedBookings = confirmedBookings.filter((b) => {
    return new Date(b.end_at) > new Date() && new Date(b.start_at) <= new Date(Date.now() + 7 * 86_400_000);
  });

  // Map: resource_id → status
  const occupiedSet = new Set(activeBookings.map((b) => b.resource_id));
  const reservedSet = new Set(reservedBookings.map((b) => b.resource_id));
  const bookingByResource = new Map<string, typeof activeBookings[number]>();
  for (const b of activeBookings) bookingByResource.set(b.resource_id, b);
  for (const b of reservedBookings) {
    if (!bookingByResource.has(b.resource_id)) bookingByResource.set(b.resource_id, b);
  }

  // Group resources by type → RoomType
  const byType = new Map<string, typeof resources>();
  for (const r of resources) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type)!.push(r);
  }

  let coverIndex = 0;
  const roomTypes: RoomType[] = Array.from(byType.entries()).map(([type, items]) => {
    const occupiedHere = items.filter((r) => occupiedSet.has(r.id)).length;
    const sample = items[0];
    const attrs = (sample.attributes ?? {}) as Record<string, unknown>;
    const amenities = Array.isArray(attrs.amenities)
      ? (attrs.amenities as string[])
      : [String(attrs.bed ?? ""), `Capacity ${attrs.capacity ?? 1}`].filter(Boolean);
    return {
      id: type,
      name: type,
      description: sample.description ?? `${type} room`,
      pricePerNight: Math.round(sample.base_price_cents / 100),
      totalRooms: items.length,
      occupied: occupiedHere,
      amenities,
      image: typeof attrs.image === "string" && attrs.image
        ? attrs.image
        : COVERS[coverIndex++ % COVERS.length],
      status: sample.active ? "active" : "inactive",
    };
  });

  const rooms: Room[] = resources.map((r) => {
    let status: Room["status"] = "available";
    if (!r.active) status = "maintenance";
    else if (occupiedSet.has(r.id)) status = "occupied";
    else if (reservedSet.has(r.id)) status = "reserved";
    const booking = bookingByResource.get(r.id);
    const guest = booking?.customer_id ? customerById.get(booking.customer_id) : null;
    return {
      id: r.id,
      roomTypeId: r.type,
      roomNumber: r.name ?? r.id.slice(0, 6).toUpperCase(),
      floor: 1,
      status,
      currentGuest: guest?.full_name ?? undefined,
      checkOut: booking?.end_at,
    };
  });

  return <RoomsView roomTypes={roomTypes} rooms={rooms} config={config} counts={counts} />;
}
