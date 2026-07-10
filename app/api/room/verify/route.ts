import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CURRENCY_SYMBOL } from "@/lib/currency";

/**
 * Guest scans QR code in room → enters name → this endpoint:
 *   1. Finds active/confirmed bookings for that room
 *   2. Fuzzy-matches the guest name
 *   3. Logs the scan to kodagen.room_scans (anti-fraud record)
 *   4. Returns booking details if matched
 *
 * Always returns ok:true so the guest gets WiFi/info regardless.
 * The `matched` field tells the owner dashboard whether a real booking exists.
 */
export async function POST(request: NextRequest) {
  let body: { slug?: string; siteId?: string; roomNumber?: string; resourceId?: string; guestName?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const slug = String(body.slug ?? "").trim();
  const roomNumber = String(body.roomNumber ?? "").trim();
  const guestName = String(body.guestName ?? "").trim().toLowerCase();
  const resourceId = body.resourceId ?? null;

  // Resolve site_id from the SLUG server-side — NEVER trust a client-supplied
  // site id. This route is public and service-role; accepting body.siteId let
  // anyone read another tenant's active bookings (guest name, checkout, total,
  // paid status) and write scan rows into their data by guessing a uuid.
  if (!slug || !roomNumber || !guestName) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const kodagenDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "kodagen" } },
  );

  const { data: site } = await kodagenDb.from("sites")
    .select("id, status").eq("slug", slug).maybeSingle();
  if (!site || site.status !== "active") {
    return NextResponse.json({ ok: false, error: "Site not found" }, { status: 404 });
  }
  const siteId = site.id as string;

  const bookingDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "booking" } },
  );

  // Find bookings for this room that are currently active or confirmed
  type MatchedBooking = {
    id: string; reference: string; end_at: string;
    guest_count: number; total_cents: number; state: string;
    fields: Record<string, unknown>;
  };
  let matchedBooking: MatchedBooking | null = null;

  if (resourceId) {
    // Only match bookings for THIS room that are currently active or confirmed
    // AND whose stay dates include today (so old completed/future bookings don't match)
    const now = new Date().toISOString();
    const { data: bookings } = await bookingDb.from("bookings")
      .select("id, reference, end_at, guest_count, total_cents, state, fields, customer_id")
      .eq(FK_COL, siteId)
      .eq("resource_id", resourceId)
      .in("state", ["confirmed", "active"])
      .lte("start_at", now)   // started before now
      .gte("end_at", now)     // hasn't ended yet
      .order("start_at", { ascending: false })
      .limit(5);

    // Try to match by guest name (fuzzy — checks if the typed name appears in the booking name)
    for (const b of bookings ?? []) {
      const bf = (b.fields ?? {}) as Record<string, unknown>;
      const bookingName = (typeof bf.guest_name === "string" ? bf.guest_name : "").toLowerCase();

      // Also check customer table
      let customerName = "";
      if (b.customer_id) {
        const { data: c } = await bookingDb.from("customers")
          .select("full_name").eq("id", b.customer_id).eq(FK_COL, siteId).maybeSingle();
        customerName = ((c?.full_name as string) ?? "").toLowerCase();
      }

      // Match if the typed name contains OR is contained in the booking name
      if (
        bookingName.includes(guestName) || guestName.includes(bookingName) ||
        customerName.includes(guestName) || guestName.includes(customerName)
      ) {
        matchedBooking = b as unknown as MatchedBooking;
        break;
      }
    }

    // NO fallback to "most recent booking" on a name mismatch — returning a
    // booking the guest couldn't name is a PII leak (anyone scanning/guessing
    // a room number would get the current guest's details). Require a match.
  }

  // Check if payment exists for this booking (scoped to this site).
  let paid = false;
  if (matchedBooking) {
    const { data: tx } = await bookingDb.from("transactions")
      .select("id")
      .eq(FK_COL, siteId)
      .eq("booking_ref", matchedBooking.reference)
      .eq("status", "succeeded")
      .maybeSingle();
    paid = !!tx;
  }

  // Log the scan — this is the anti-fraud record
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  const ua = request.headers.get("user-agent") ?? "";

  await kodagenDb.from("room_scans").insert({
    site_id: siteId,
    room_number: roomNumber,
    resource_id: resourceId,
    booking_id: matchedBooking?.id ?? null,
    booking_ref: matchedBooking?.reference ?? null,
    guest_name: guestName,
    matched: !!matchedBooking,
    ip_address: ip.slice(0, 45),
    user_agent: ua.slice(0, 200),
  });

  console.log(`[room-scan] Room ${roomNumber} scanned by "${guestName}" — ${matchedBooking ? `matched ${matchedBooking.reference}` : "NO MATCH"}`);

  // Always return ok — guest gets WiFi regardless
  if (matchedBooking) {
    const bf = (matchedBooking.fields ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      matched: true,
      booking: {
        reference: matchedBooking.reference,
        checkOut: matchedBooking.end_at,
        guests: matchedBooking.guest_count,
        totalFormatted: `${CURRENCY_SYMBOL}${(matchedBooking.total_cents / 100).toLocaleString()}`,
        guestName: (typeof bf.guest_name === "string" ? bf.guest_name : null) ?? guestName,
        paid,
      },
    });
  }

  return NextResponse.json({ ok: true, matched: false });
}
