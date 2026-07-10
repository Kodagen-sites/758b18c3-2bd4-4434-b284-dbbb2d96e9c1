import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEnabledProviders, loadProvider, getSiteByRef } from "@/lib/payments/providers";
import { paystackInitialize } from "@/lib/payments/paystack";
import { stripeInitialize } from "@/lib/payments/stripe";
import { recordPayment } from "@/lib/payments/report";

/**
 * Public endpoint — initialises a payment against an existing booking OR
 * catalog order.
 *
 * Booking flow:
 *   1. Customer completes the booking modal → booking row exists in `pending`
 *   2. Modal POSTs here with { slug, reference, provider? }
 * Order flow:
 *   1. Checkout POSTs /api/orders → order row exists in `pending`
 *   2. Checkout POSTs here with { slug, orderId, provider? }
 *
 * Either way: we pull the site's keys, call the gateway, record a `pending`
 * transaction + stamp the row's payment_ref, and return
 * `{ provider, authorization_url? | client_secret? }`. After payment the
 * gateway calls our webhook, which flips the rows.
 *
 * Amounts ALWAYS come from the DB row (server-priced) — never from the client.
 */
export async function POST(request: NextRequest) {
  let body: { slug?: string; reference?: string; orderId?: string; provider?: "paystack" | "stripe" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const reference = String(body.reference ?? "").trim();
  const orderId = String(body.orderId ?? "").trim();
  if (!slug || (!reference && !orderId)) {
    return NextResponse.json({ ok: false, error: "Missing slug or reference/orderId" }, { status: 400 });
  }

  const site = await getSiteByRef(slug);
  if (!site) return NextResponse.json({ ok: false, error: "Site not found" }, { status: 404 });

  // Pick the provider — explicit if asked, otherwise the first enabled one
  let providerKind: "paystack" | "stripe" | null = body.provider ?? null;
  if (!providerKind) {
    const all = await loadEnabledProviders(site.id);
    providerKind = (all.find((p) => p.kind === "paystack") ?? all[0])?.kind ?? null;
  }
  if (!providerKind) {
    return NextResponse.json({ ok: false, error: "No payment provider configured for this site" }, { status: 400 });
  }
  const provider = await loadProvider(site.id, providerKind);
  if (!provider) {
    return NextResponse.json({ ok: false, error: `${providerKind} is not enabled or missing keys` }, { status: 400 });
  }

  let svc: ReturnType<typeof createServiceClient> | null = null;
  try { svc = createServiceClient(); } catch { svc = null; }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  // ══ Order lane ═══════════════════════════════════════════════════════════
  if (orderId) {
    let order: { id: string; total: number; guest_email: string | null; guest_name: string | null; notes: string | null; status: string } | null = null;
    if (svc) {
      const { data } = await svc.from("orders")
        .select("id, total, guest_email, guest_name, notes, status")
        .eq("id", orderId).eq(FK_COL, site.id).maybeSingle();
      order = (data as typeof order) ?? null;
    } else {
      const anon = await createClient();
      const { data } = await anon.rpc("get_order_public", { p_slug: slug, p_order_id: orderId });
      const o = data as Record<string, unknown> | null;
      if (o?.id) {
        order = {
          id: o.id as string, total: Number(o.total ?? 0),
          guest_email: (o.guest_email as string) ?? null, guest_name: (o.guest_name as string) ?? null,
          notes: (o.notes as string) ?? null, status: (o.status as string) ?? "pending",
        };
      }
    }
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ ok: false, error: "Order is already paid" }, { status: 409 });
    const email = order.guest_email;
    if (!email) return NextResponse.json({ ok: false, error: "Order has no customer email — required for Paystack/Stripe" }, { status: 400 });
    const amount = Math.max(0, Math.round(order.total));
    const currency = order.notes || provider.currency || "USD";
    const confirmedUrl = `${siteBaseUrl}/order/confirmed?ref=${order.id}`;

    if (provider.kind === "paystack") {
      const res = await paystackInitialize(provider, {
        amount_cents: amount,
        currency,
        email,
        reference: `ORD-${order.id}`,
        callback_url: confirmedUrl,
        metadata: { order_id: order.id, slug, customer_name: order.guest_name ?? "" },
      });
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
      await recordPayment(site.id, {
        kind: "order", event: "initialized", orderId: order.id,
        provider: "paystack", providerRef: res.reference,
        amountCents: amount, currency, customerEmail: email, customerName: order.guest_name,
      });
      return NextResponse.json({ ok: true, provider: "paystack", authorization_url: res.authorization_url, reference: res.reference });
    }

    const res = await stripeInitialize(provider, {
      amount_cents: amount,
      currency,
      email,
      reference: `ORD-${order.id}`,
      description: `Order ${order.id.slice(0, 8).toUpperCase()}`,
      metadata: { order_id: order.id, slug, customer_email: email, customer_name: order.guest_name ?? "" },
      success_url: `${confirmedUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${confirmedUrl}&cancelled=1`,
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
    await recordPayment(site.id, {
      kind: "order", event: "initialized", orderId: order.id,
      provider: "stripe", providerRef: res.session_id,
      amountCents: amount, currency, customerEmail: email, customerName: order.guest_name,
    });
    return NextResponse.json({ ok: true, provider: "stripe", authorization_url: res.checkout_url, reference: res.session_id });
  }

  // ══ Booking lane ═════════════════════════════════════════════════════════
  type Cust = { full_name: string | null; email: string | null; phone: string | null };
  let booking: { id: string; reference: string; total_cents: number; currency: string | null } | null = null;
  let c: Partial<Cust> = {};
  if (svc) {
    const { data } = await withSchema(svc, BOOKING_SCHEMA)
      .from("bookings")
      .select(`
        id, reference, total_cents, currency, customer_id,
        booking_customer:customers!inner(full_name, email, phone)
      `)
      .eq(FK_COL, site.id)
      .eq("reference", reference)
      .maybeSingle();
    if (data) {
      booking = data as unknown as typeof booking;
      c = (data as unknown as { booking_customer?: Cust }).booking_customer ?? {};
    }
  } else {
    const anon = await createClient();
    const { data } = await withSchema(anon, BOOKING_SCHEMA)
      .rpc("get_booking_for_payment", { p_slug: slug, p_reference: reference });
    const b = data as Record<string, unknown> | null;
    if (b?.id) {
      booking = {
        id: b.id as string, reference: b.reference as string,
        total_cents: Number(b.total_cents ?? 0), currency: (b.currency as string) ?? null,
      };
      c = { full_name: (b.full_name as string) ?? null, email: (b.email as string) ?? null, phone: (b.phone as string) ?? null };
    }
  }
  if (!booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });

  const email = c.email;
  if (!email) {
    return NextResponse.json({ ok: false, error: "Booking has no customer email — required for Paystack/Stripe" }, { status: 400 });
  }

  // ── Paystack ──
  if (provider.kind === "paystack") {
    const res = await paystackInitialize(provider, {
      amount_cents: booking.total_cents,
      currency: booking.currency ?? provider.currency,
      email,
      reference,
      callback_url: `${origin}/booking/${reference}/return`,
      metadata: { booking_reference: reference, slug },
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });

    // Record a pending transaction so it shows up in admin even before webhook
    await recordPayment(site.id, {
      kind: "booking", event: "initialized",
      bookingId: booking.id, bookingRef: reference,
      provider: "paystack", providerRef: res.reference,
      amountCents: booking.total_cents, currency: booking.currency ?? provider.currency,
      customerEmail: email, customerName: c.full_name ?? null,
    });
    return NextResponse.json({
      ok: true,
      provider: "paystack",
      authorization_url: res.authorization_url,
      reference: res.reference,
    });
  }

  // ── Stripe ──
  const res = await stripeInitialize(provider, {
    amount_cents: booking.total_cents,
    currency: booking.currency ?? provider.currency,
    email,
    reference,
    description: `Booking ${reference}`,
    metadata: {
      booking_reference: reference,
      slug,
      customer_email: email,
      customer_name: c.full_name ?? "",
    },
    success_url: `${siteBaseUrl}/booking/${reference}/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteBaseUrl}/booking/${reference}/return?cancelled=1`,
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });

  await recordPayment(site.id, {
    kind: "booking", event: "initialized",
    bookingId: booking.id, bookingRef: reference,
    provider: "stripe", providerRef: res.session_id,
    amountCents: booking.total_cents, currency: booking.currency ?? provider.currency,
    customerEmail: email, customerName: c.full_name ?? null,
  });
  return NextResponse.json({
    ok: true,
    provider: "stripe",
    authorization_url: res.checkout_url,
    reference: res.session_id,
  });
}
