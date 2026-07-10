import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { CURRENCY_SYMBOL } from "@/lib/currency";

/**
 * Polling endpoint for admin live updates.
 * Returns counts of new events since a given timestamp.
 *
 * GET /api/admin/notifications?since=2026-04-17T10:00:00Z
 */
export async function GET(request: NextRequest) {
  const ctx = await getCurrentSite();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

  const since = request.nextUrl.searchParams.get("since") ?? new Date(Date.now() - 60_000).toISOString();
  const supabase = await createClient();

  const [bookings, inquiries, transactions, scans] = await Promise.all([
    withSchema(supabase, BOOKING_SCHEMA).from("bookings")
      .select("reference, state, created_at", { count: "exact", head: false })
      .eq(FK_COL, ctx.siteId)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5),
    withSchema(supabase, KODAGEN_SCHEMA).from("inquiries")
      .select("id, name, created_at", { count: "exact", head: false })
      .eq(FK_COL, ctx.siteId)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5),
    withSchema(supabase, BOOKING_SCHEMA).from("transactions")
      .select("booking_ref, status, amount_cents, created_at", { count: "exact", head: false })
      .eq(FK_COL, ctx.siteId)
      .eq("status", "succeeded")
      .gt("created_at", since)
      .limit(5),
    withSchema(supabase, KODAGEN_SCHEMA).from("room_scans")
      .select("room_number, matched, created_at:scanned_at", { count: "exact", head: false })
      .eq(FK_COL, ctx.siteId)
      .eq("matched", false)
      .gt("scanned_at", since)
      .limit(5),
  ]);

  // Build notification items
  type Notification = { type: string; message: string; time: string };
  const items: Notification[] = [];

  for (const b of bookings.data ?? []) {
    items.push({
      type: "booking",
      message: `New booking ${b.reference}`,
      time: b.created_at as string,
    });
  }
  for (const i of inquiries.data ?? []) {
    items.push({
      type: "inquiry",
      message: `New message from ${i.name}`,
      time: i.created_at as string,
    });
  }
  for (const t of transactions.data ?? []) {
    items.push({
      type: "payment",
      message: `Payment received — ${t.booking_ref} (${CURRENCY_SYMBOL}${Math.round((t.amount_cents as number) / 100).toLocaleString()})`,
      time: t.created_at as string,
    });
  }
  for (const s of scans.data ?? []) {
    items.push({
      type: "scan_alert",
      message: `Unmatched room scan: ${s.room_number}`,
      time: (s as Record<string, unknown>).created_at as string,
    });
  }

  items.sort((a, b) => +new Date(b.time) - +new Date(a.time));

  return NextResponse.json({
    ok: true,
    total: items.length,
    counts: {
      bookings: bookings.count ?? 0,
      inquiries: inquiries.count ?? 0,
      payments: transactions.count ?? 0,
      scanAlerts: scans.count ?? 0,
    },
    items: items.slice(0, 10),
  });
}
