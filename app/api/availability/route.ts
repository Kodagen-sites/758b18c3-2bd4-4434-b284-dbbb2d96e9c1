import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CURRENCY_CODE, CURRENCY_SYMBOL } from "@/lib/currency";

/**
 * Public endpoint — check which room types have availability for given dates.
 *
 * GET /api/availability?slug=your-site-slug&checkIn=2026-05-10&checkOut=2026-05-13
 *
 * Returns:
 *   { ok: true, types: [
 *       { type: "Deluxe Room", available: 5, total: 8, price: 4500000, image: "..." },
 *       { type: "Executive Suite", available: 0, total: 6, price: 8500000, image: "...", soldOut: true },
 *     ]
 *   }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug     = searchParams.get("slug") ?? "";
  const checkIn  = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";

  if (!slug || !checkIn || !checkOut) {
    return NextResponse.json({ ok: false, error: "Missing slug, checkIn or checkOut" }, { status: 400 });
  }

  const startISO = new Date(`${checkIn}T15:00:00`).toISOString();
  const endISO   = new Date(`${checkOut}T11:00:00`).toISOString();
  if (new Date(endISO) <= new Date(startISO)) {
    return NextResponse.json({ ok: false, error: "Check-out must be after check-in." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve site
  const { data: site } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("sites")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!site || site.status !== "active") return NextResponse.json({ ok: false, error: "Site not found." }, { status: 404 });

  const siteId = site.id as string;

  // Get all active rooms
  const { data: resources } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("resources")
    .select("id, type, name, base_price_cents, currency, attributes, active, description")
    .eq(FK_COL, siteId)
    .eq("active", true)
    .order("sort_order");

  if (!resources || resources.length === 0) {
    return NextResponse.json({ ok: true, types: [] });
  }

  // Find which rooms are booked during the requested dates.
  // A room is unavailable if it has a 'booked' availability row that overlaps
  // the requested range, OR if it has a booking in pending/confirmed/active state
  // that overlaps.
  const { data: bookedAvail } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("availability")
    .select("resource_id")
    .eq(FK_COL, siteId)
    .eq("status", "booked")
    .lt("start_at", endISO)
    .gt("end_at", startISO);

  const bookedResourceIds = new Set((bookedAvail ?? []).map((r: any) => r.resource_id as string));

  // Group by type and count available vs total
  const byType = new Map<string, {
    type: string;
    total: number;
    available: number;
    price: number;
    currency: string;
    image: string;
    description: string;
  }>();

  for (const r of resources) {
    const type = r.type as string;
    if (!byType.has(type)) {
      const attrs = (r.attributes ?? {}) as Record<string, unknown>;
      byType.set(type, {
        type,
        total: 0,
        available: 0,
        price: r.base_price_cents as number,
        currency: (r.currency as string) ?? CURRENCY_CODE,
        image: typeof attrs.image === "string" ? attrs.image : "",
        description: (r.description as string) ?? "",
      });
    }
    const entry = byType.get(type)!;
    entry.total++;
    if (!bookedResourceIds.has(r.id as string)) {
      entry.available++;
    }
  }

  const types = Array.from(byType.values()).map((t) => ({
    ...t,
    soldOut: t.available === 0,
    priceFormatted: `From ${CURRENCY_SYMBOL}${Math.round(t.price / 100).toLocaleString()}/night`,
  }));

  return NextResponse.json({ ok: true, types });
}
