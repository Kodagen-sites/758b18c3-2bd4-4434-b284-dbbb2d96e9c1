import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { services } from "@kodagen/booking-engine";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import type { Booking, Inquiry } from "@/lib/admin-types";
import DashboardView, { type DashboardData } from "./dashboard-view";


const stateToStatus: Record<string, Booking["status"]> = {
  pending:   "pending",
  confirmed: "confirmed",
  active:    "checked_in",
  completed: "checked_out",
  cancelled: "cancelled",
  no_show:   "no_show",
};

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function timeAgo(d: Date): string {
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  const wk = Math.round(day / 7);
  return `${wk} week${wk === 1 ? "" : "s"} ago`;
}

export default async function DashboardPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  // Authenticated cookie client — inquiries read via member RLS; engine reads
  // (booking) that this site doesn't use return empty under RLS rather than
  // erroring, so the dashboard renders without a service key.
  const supabase = await createClient();

  const today = startOfDay();
  const weekAgo = addDays(today, -7);
  const tomorrow = addDays(today, 1);

  const [allBookings, resources, customers, config, counts, { data: txRows }, { data: inquiryRows }] = await Promise.all([
    services.listBookings(supabase, ctx.siteId, { limit: 500 }),
    services.listResources(supabase, ctx.siteId),
    services.listCustomers(supabase, ctx.siteId, { limit: 500 }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    withSchema(supabase, BOOKING_SCHEMA).from("transactions")
      .select("amount_cents, status, created_at")
      .eq(FK_COL, ctx.siteId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(500),
    withSchema(supabase, KODAGEN_SCHEMA).from("inquiries")
      .select("id, name, status, created_at")
      .eq(FK_COL, ctx.siteId)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const mapBooking = (b: typeof allBookings[number]): Booking => {
    const resource = resourceById.get(b.resource_id);
    const customer = b.customer_id ? customerById.get(b.customer_id) : null;
    const checkIn = new Date(b.start_at);
    const checkOut = new Date(b.end_at);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
    const fields = (b.fields ?? {}) as Record<string, unknown>;
    return {
      id: b.reference,
      guestName: (typeof fields.guest_name === "string" ? fields.guest_name : null) ?? customer?.full_name ?? "Walk-in guest",
      guestEmail: (typeof fields.guest_email === "string" ? fields.guest_email : null) ?? customer?.email ?? "",
      guestPhone: (typeof fields.guest_phone === "string" ? fields.guest_phone : null) ?? customer?.phone ?? "",
      roomType: resource?.type ?? "—",
      resourceId: b.resource_id,
      roomNumber: resource?.name ?? b.resource_id.slice(0, 6).toUpperCase(),
      checkIn: b.start_at,
      checkOut: b.end_at,
      nights,
      guests: b.guest_count,
      totalPrice: Math.round(b.total_cents / 100),
      status: stateToStatus[b.state] ?? "confirmed",
      specialRequests: typeof fields.special_requests === "string" ? fields.special_requests : undefined,
      bookingType: (() => {
        const attrs = (resource?.attributes ?? {}) as Record<string, unknown>;
        return attrs.category === "event" ? "event" as const : "room" as const;
      })(),
      paymentStatus: "unpaid" as const,
      createdAt: b.created_at,
    };
  };

  const all = allBookings.map(mapBooking);
  // Recent bookings sorted by created date (newest first)
  const recentBookings = [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
  const currentGuests = all.filter((b) => b.status === "checked_in");

  const todaysBookings = allBookings.filter((b) => {
    const s = new Date(b.created_at);
    return s >= today && s < tomorrow;
  });
  const bookingsToday = todaysBookings.length;

  // Revenue from REAL transactions (not just booking amounts)
  const totalRevenue = (txRows ?? []).reduce((sum: number, t: any) => sum + Math.round((t.amount_cents as number) / 100), 0);
  const revenueToday = (txRows ?? [])
    .filter((t: any) => new Date(t.created_at as string) >= today && new Date(t.created_at as string) < tomorrow)
    .reduce((sum: number, t: any) => sum + Math.round((t.amount_cents as number) / 100), 0);

  // 7-day charts from bookings created date (not start_at)
  const bookings7d: number[] = new Array(7).fill(0);
  const revenue7d: number[] = new Array(7).fill(0);
  for (const b of allBookings) {
    const s = new Date(b.created_at);
    const dayIndex = Math.floor((s.getTime() - weekAgo.getTime()) / 86_400_000);
    if (dayIndex >= 0 && dayIndex < 7) {
      bookings7d[dayIndex] += 1;
    }
  }
  for (const t of txRows ?? []) {
    const s = new Date(t.created_at as string);
    const dayIndex = Math.floor((s.getTime() - weekAgo.getTime()) / 86_400_000);
    if (dayIndex >= 0 && dayIndex < 7) {
      revenue7d[dayIndex] += Math.round((t.amount_cents as number) / 100);
    }
  }

  // New unread inquiries
  const newInquiryCount = (inquiryRows ?? []).length;

  const activityFeed = recentBookings.slice(0, 10).map((b) => {
    const colorByStatus: Record<string, string> = {
      confirmed:   "#22c55e",
      pending:     "#f59e0b",
      checked_in:  "#3b82f6",
      checked_out: "#64748b",
      cancelled:   "#ef4444",
    };
    const ago = timeAgo(new Date(b.createdAt));
    const isEvent = b.bookingType === "event";
    const verb = b.status === "checked_in"
      ? `checked in to ${b.roomType}`
      : b.status === "checked_out"
        ? `completed check-out`
        : b.status === "cancelled"
          ? `cancelled their booking`
          : isEvent
            ? `booked ${b.roomType} (event)`
            : `booked ${b.roomType}`;
    return {
      text: `${b.guestName} ${verb}`,
      time: ago,
      color: colorByStatus[b.status] ?? "#64748b",
    };
  });

  const data: DashboardData = {
    recentBookings,
    currentGuests,
    newInquiries: [],
    stats: {
      totalRevenue,
      revenueToday,
      bookingsToday,
      pageViews: 0,
      newInquiries: newInquiryCount,
      conversionRate: 0,
    },
    charts: {
      revenue7d,
      bookings7d,
      pageViews7d: new Array(7).fill(0),
      inquiries7d: new Array(7).fill(0),
    },
    activityFeed,
  };

  return <DashboardView data={data} config={config} counts={counts} />;
}
