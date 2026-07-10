import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { services } from "@kodagen/booking-engine";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import type { Booking } from "@/lib/admin-types";
import BookingsView from "./bookings-view";


// Map engine state → admin UI status
const stateToStatus: Record<string, Booking["status"]> = {
  pending:   "pending",
  confirmed: "confirmed",
  active:    "checked_in",
  completed: "checked_out",
  cancelled: "cancelled",
  no_show:   "no_show",
};

export default async function BookingsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();

  const [engineBookings, resources, customers, config, counts, { data: transactions }] = await Promise.all([
    services.listBookings(supabase, ctx.siteId, { limit: 200 }),
    services.listResources(supabase, ctx.siteId),
    services.listCustomers(supabase, ctx.siteId, { limit: 200 }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    withSchema(supabase, BOOKING_SCHEMA).from("transactions")
      .select("booking_ref, status, provider")
      .eq(FK_COL, ctx.siteId)
      .in("status", ["succeeded", "pending"]),
  ]);

  // Map booking reference → payment info
  const txByRef = new Map<string, { status: string; provider: string }>();
  for (const tx of transactions ?? []) {
    const ref = tx.booking_ref as string;
    const existing = txByRef.get(ref);
    // succeeded takes priority over pending
    if (!existing || tx.status === "succeeded") {
      txByRef.set(ref, { status: tx.status as string, provider: tx.provider as string });
    }
  }

  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const bookings: Booking[] = engineBookings.map((b) => {
    const resource = resourceById.get(b.resource_id);
    const customer = b.customer_id ? customerById.get(b.customer_id) : null;
    const checkIn = new Date(b.start_at);
    const checkOut = new Date(b.end_at);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
    const fields = (b.fields ?? {}) as Record<string, unknown>;

    // Per-booking guest details from fields take priority over the shared
    // customer row — two people booking with the same email keep their own names.
    const bf = (b.fields ?? {}) as Record<string, unknown>;
    return {
      id: b.reference,
      guestName: (typeof bf.guest_name === "string" ? bf.guest_name : null) ?? customer?.full_name ?? "Walk-in guest",
      guestEmail: (typeof bf.guest_email === "string" ? bf.guest_email : null) ?? customer?.email ?? "",
      guestPhone: (typeof bf.guest_phone === "string" ? bf.guest_phone : null) ?? customer?.phone ?? "",
      roomType: resource?.type ?? "—",
      resourceId: b.resource_id,
      roomNumber: resource?.name ?? b.resource_id.slice(0, 6).toUpperCase(),
      bookingType: (() => {
        const attrs = (resource?.attributes ?? {}) as Record<string, unknown>;
        return attrs.category === "event" ? "event" as const : "room" as const;
      })(),
      checkIn: b.start_at,
      checkOut: b.end_at,
      nights,
      guests: b.guest_count,
      totalPrice: Math.round(b.total_cents / 100),
      status: stateToStatus[b.state] ?? "confirmed",
      specialRequests: typeof fields.special_requests === "string" ? fields.special_requests : undefined,
      paymentStatus: (() => {
        const tx = txByRef.get(b.reference);
        if (!tx) return "unpaid" as const;
        if (tx.status === "succeeded") return "paid" as const;
        return "pending_payment" as const;
      })(),
      paymentProvider: txByRef.get(b.reference)?.provider,
      createdAt: b.created_at,
    };
  });

  // Group bookings by resource so we know which rooms are taken right now,
  // who's in them, and when they're checking out — fuel for the floor-plan picker.
  const liveBookingsByResource = new Map<string, typeof engineBookings[number][]>();
  for (const b of engineBookings) {
    if (b.state !== "active" && b.state !== "confirmed") continue;
    if (!liveBookingsByResource.has(b.resource_id)) liveBookingsByResource.set(b.resource_id, []);
    liveBookingsByResource.get(b.resource_id)!.push(b);
  }
  const SOON_MS = 24 * 60 * 60 * 1000;

  const roomsForPicker = resources.map((r) => {
    const onThisRoom = liveBookingsByResource.get(r.id) ?? [];
    const occupier  = onThisRoom.find((b) => b.state === "active");
    const upcoming  = onThisRoom.find((b) => b.state === "confirmed" && new Date(b.start_at).getTime() < Date.now() + SOON_MS);
    let status: "available" | "occupied" | "reserved" | "maintenance" = "available";
    if (!r.active) status = "maintenance";
    else if (occupier) status = "occupied";
    else if (upcoming) status = "reserved";

    const guest = (occupier ?? upcoming)?.customer_id ? customerById.get((occupier ?? upcoming)!.customer_id!) : null;
    const checkOut = occupier?.end_at ?? upcoming?.end_at ?? null;
    const nightsLeft = checkOut ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - Date.now()) / 86_400_000)) : null;

    return {
      id: r.id,
      name: r.name ?? r.id.slice(0, 6).toUpperCase(),
      type: r.type,
      status,
      checkOut,
      nightsLeft,
      guestName: guest?.full_name ?? null,
    };
  });

  return <BookingsView bookings={bookings} rooms={roomsForPicker} config={config} counts={counts} />;
}
