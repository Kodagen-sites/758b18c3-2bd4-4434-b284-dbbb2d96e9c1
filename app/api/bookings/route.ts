import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { services } from "@kodagen/booking-engine";
import { recordPayment } from "@/lib/payments/report";
import { loadEnabledProviders } from "@/lib/payments/providers";
import { paystackInitialize } from "@/lib/payments/paystack";
import { stripeInitialize } from "@/lib/payments/stripe";
import { sendEmail } from "@/lib/email/send";
import { bookingConfirmationEmail, eventConfirmationEmail } from "@/lib/email/templates";
import { CURRENCY_CODE, CURRENCY_SYMBOL } from "@/lib/currency";
import { googleSheetsAppendRow, googleCalendarCreateEvent } from "@/lib/google";

/**
 * Public endpoint — no auth. Visitor submits the booking modal on the site.
 * Resolves site_id from slug, looks up an available resource matching the
 * requested room TYPE, then creates customer + availability hold + booking row
 * via the booking engine. Bookings start in `confirmed` state — admin can
 * check guest in/out from /admin/bookings.
 */
export async function POST(request: NextRequest) {
  let body: {
    slug?: string;
    roomType?: string;             // human "Deluxe Room", "Executive Suite", …
    checkIn?: string;              // YYYY-MM-DD
    checkOut?: string;             // YYYY-MM-DD
    guests?: number;
    name?: string;
    email?: string;
    phone?: string;
    specialRequests?: string;
    /** Customer's chosen payment method — if omitted, picks the first enabled one */
    paymentMethod?: "paystack" | "stripe";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const roomType = String(body.roomType ?? "").trim();
  const checkIn = String(body.checkIn ?? "").trim();
  const checkOut = String(body.checkOut ?? "").trim();
  const guests = Math.max(1, Math.min(20, Number(body.guests ?? 1)));
  const name = String(body.name ?? "").trim().slice(0, 200);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 50);
  const specialRequests = String(body.specialRequests ?? "").trim().slice(0, 4000);

  if (!slug || !roomType || !checkIn || !checkOut || !name) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ ok: false, error: "Email or phone is required." }, { status: 400 });
  }

  // Same-day bookings (appointments/events) default to 9am-11pm; an explicit
  // startTime ("HH:mm", from the appointment-mode booking drawer) books that
  // slot instead — endTime or startTime+60min. Multi-day (rooms) use 3pm-11am.
  const sameDay = checkIn === checkOut;
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  const startTime = String((body as { startTime?: string }).startTime ?? "").trim();
  const endTime = String((body as { endTime?: string }).endTime ?? "").trim();
  let startISO: string;
  let endISO: string;
  if (sameDay && hhmm.test(startTime)) {
    const start = new Date(`${checkIn}T${startTime}:00`);
    const end = hhmm.test(endTime) && endTime > startTime
      ? new Date(`${checkIn}T${endTime}:00`)
      : new Date(start.getTime() + 60 * 60_000);
    startISO = start.toISOString();
    endISO = end.toISOString();
  } else {
    startISO = new Date(`${checkIn}T${sameDay ? "09:00:00" : "15:00:00"}`).toISOString();
    endISO   = new Date(`${checkOut}T${sameDay ? "23:00:00" : "11:00:00"}`).toISOString();
  }
  if (new Date(endISO) <= new Date(startISO)) {
    return NextResponse.json({ ok: false, error: "Check-out must be after check-in." }, { status: 400 });
  }

  // Service client in dedicated/legacy mode; cookie-anon client keyless. The
  // keyless lane reads only public-safe rows (resources via the active-site
  // RLS policy) and writes through the `place_booking` definer RPC.
  let svc: ReturnType<typeof createServiceClient> | null = null;
  try { svc = createServiceClient(); } catch { svc = null; }
  const supabase = svc ?? (await createClient());

  let site: { id: string; status: string } | null = null;
  let publicSite: Record<string, unknown> | null = null;
  if (svc) {
    const { data } = await withSchema(svc, KODAGEN_SCHEMA)
      .from("sites")
      .select("id, status")
      .eq("slug", slug)
      .maybeSingle();
    site = (data as typeof site) ?? null;
  } else {
    const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
      .rpc("get_public_site", { p_slug: slug });
    const s = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (s?.site_id) {
      publicSite = s;
      site = { id: s.site_id as string, status: "active" }; // RPC returns active sites only
    }
  }
  if (!site || site.status !== "active") return NextResponse.json({ ok: false, error: "Site not found." }, { status: 404 });

  // Find the first physical room of that TYPE that doesn't already have a
  // conflicting booking. Cheap two-step: list active rooms of the type, then
  // ask the engine for each one until availability accepts.
  const { data: candidates } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("resources")
    .select("id, name, base_price_cents, currency, attributes")
    .eq(FK_COL, site.id)
    .eq("type", roomType)
    .eq("active", true)
    .order("sort_order");

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: false, error: `No "${roomType}" rooms available.` }, { status: 404 });
  }

  // Compute nights × base price for total
  const nights = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 86_400_000));
  const total_cents = (candidates[0].base_price_cents as number) * nights;
  const currency = (candidates[0].currency as string) ?? CURRENCY_CODE;

  let lastError = "";
  for (const room of candidates) {
    try {
      const booking = svc
        ? await services.createBooking(svc, site.id, {
            resource_id: room.id as string,
            start_at: startISO,
            end_at: endISO,
            guest_count: guests,
            total_cents,
            currency,
            customer: {
              full_name: name,
              email: email || undefined,
              phone: phone || undefined,
            },
            fields: specialRequests ? { special_requests: specialRequests } : {},
          })
        : await (async () => {
            // Keyless: the definer RPC picks the room, dedupes the customer,
            // holds availability and prices server-side in one transaction.
            const { data, error: rpcErr } = await withSchema(supabase, BOOKING_SCHEMA).rpc("place_booking", {
              p_slug: slug,
              p_room_type: roomType,
              p_start: startISO,
              p_end: endISO,
              p_guests: guests,
              p_customer: { full_name: name, email: email || null, phone: phone || null },
              p_fields: specialRequests ? { special_requests: specialRequests } : {},
            });
            const r = data as { ok?: boolean; error?: string; booking_id?: string; reference?: string } | null;
            if (!r?.ok || !r.booking_id) throw new Error(r?.error || rpcErr?.message || "Booking failed.");
            return { id: r.booking_id, reference: r.reference as string };
          })();

      // ── Google sync (no-ops unless the integrations are connected) ──
      void googleSheetsAppendRow(site.id as string, [
        new Date().toISOString(), "booking", name, email, phone, roomType,
        startISO, endISO, `${(total_cents / 100).toFixed(2)} ${currency}`,
      ]);
      void googleCalendarCreateEvent(site.id as string, {
        summary: `${roomType} — ${name}`,
        description: specialRequests || "",
        startIso: startISO,
        endIso: endISO,
        attendeeEmail: email || undefined,
      });

      // ── Check if a payment provider is active → initialize payment
      const providers = await loadEnabledProviders(site.id);
      const chosenKind = body.paymentMethod;
      const provider = chosenKind
        ? providers.find((p) => p.kind === chosenKind) ?? null
        : providers[0] ?? null;

      if (provider && email) {
        const h = await headers();
        const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

        if (provider.kind === "paystack") {
          const payRes = await paystackInitialize(provider, {
            amount_cents: total_cents,
            currency: provider.currency || currency,
            email,
            reference: booking.reference,
            callback_url: `${origin}/booking/return?reference=${booking.reference}`,
            metadata: { booking_reference: booking.reference, slug },
          });
          if (payRes.ok) {
            // Write pending transaction (direct in dedicated, site-proxy keyless)
            const txOk = await recordPayment(site.id, {
              kind: "booking", event: "initialized",
              bookingId: booking.id, bookingRef: booking.reference,
              provider: "paystack", providerRef: payRes.reference,
              amountCents: total_cents, currency,
              customerEmail: email, customerName: name,
            });
            if (!txOk) console.error("[bookings] pending transaction record failed for", booking.reference);

            return NextResponse.json({
              ok: true,
              reference: booking.reference,
              payment: { provider: "paystack", authorization_url: payRes.authorization_url },
            });
          }
          // If Paystack init fails, fall through to no-payment confirmation
        }

        if (provider.kind === "stripe") {
          const payRes = await stripeInitialize(provider, {
            amount_cents: total_cents,
            currency: provider.currency || currency,
            email,
            reference: booking.reference,
            description: `Booking ${booking.reference} — ${roomType}`,
            metadata: { booking_reference: booking.reference, slug, customer_email: email, customer_name: name },
            success_url: `${origin}/booking/return?reference=${booking.reference}`,
            cancel_url: `${origin}/`,
          });
          if (payRes.ok) {
            const txOk = await recordPayment(site.id, {
              kind: "booking", event: "initialized",
              bookingId: booking.id, bookingRef: booking.reference,
              provider: "stripe", providerRef: payRes.session_id,
              amountCents: total_cents, currency,
              customerEmail: email, customerName: name,
            });
            if (!txOk) console.error("[bookings] stripe pending transaction record failed");

            return NextResponse.json({
              ok: true,
              reference: booking.reference,
              payment: { provider: "stripe", authorization_url: payRes.checkout_url },
            });
          }
        }
      }

      // ── No payment provider → confirm immediately + send email
      // Load site config for the email template (keyless already has it from
      // the get_public_site call above)
      let siteRow: { name?: unknown; config?: unknown; theme?: unknown } | null = publicSite;
      if (svc) {
        const { data } = await withSchema(svc, KODAGEN_SCHEMA).from("sites")
          .select("name, config, theme").eq("id", site.id).maybeSingle();
        siteRow = data ?? null;
      }
      const siteCfg = (siteRow?.config ?? {}) as Record<string, unknown>;
      const thm = (siteRow?.theme ?? {}) as Record<string, unknown>;

      if (email) {
        const roomAttrs = (room.attributes ?? {}) as Record<string, unknown>;
        const isEvent = roomAttrs.category === "event";
        const address = ((siteCfg.contact as Record<string, unknown> | undefined)?.address as string) || "";
        const phone2 = ((siteCfg.contact as Record<string, unknown> | undefined)?.phone as string) || "";
        const brandName = (siteCfg.businessName as string) || (siteRow?.name as string) || "Hotel";
        const brandColor = (thm.primaryColor as string) || "#1a365d";

        const tmpl = isEvent
          ? eventConfirmationEmail({
              siteName: brandName,
              brandColor,
              guestName: name,
              reference: booking.reference,
              eventName: roomType,
              eventDate: startISO,
              guests,
              duration: typeof roomAttrs.duration === "string" ? roomAttrs.duration : "Full day",
              totalFormatted: `${CURRENCY_SYMBOL}${(total_cents / 100).toLocaleString()}`,
              paymentStatus: "none",
              venueAddress: address,
              venuePhone: phone2,
            })
          : bookingConfirmationEmail({
              siteName: brandName,
              brandColor,
              guestName: name,
              reference: booking.reference,
              roomType,
              roomNumber: room.name ?? "",
              checkIn: startISO,
              checkOut: endISO,
              nights,
              guests,
              totalFormatted: `${CURRENCY_SYMBOL}${(total_cents / 100).toLocaleString()}`,
              paymentStatus: "none",
              hotelAddress: address,
              hotelPhone: phone2,
            });
        // Fire-and-forget — don't block the booking response on email delivery
        sendEmail(site.id, { to: email, ...tmpl }).catch((e) => console.error("[email] booking:", e));
      }

      return NextResponse.json({ ok: true, reference: booking.reference });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // If it's an overlap conflict, try the next physical room.
      if (!/already booked/i.test(lastError)) break;
    }
  }

  return NextResponse.json(
    { ok: false, error: lastError || "All rooms of this type are booked for those dates." },
    { status: 409 },
  );
}
