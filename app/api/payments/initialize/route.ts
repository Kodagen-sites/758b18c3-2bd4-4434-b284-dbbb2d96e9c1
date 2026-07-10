import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { loadEnabledProviders, loadProvider, getSiteByRef } from "@/lib/payments/providers";
import { paystackInitialize } from "@/lib/payments/paystack";
import { stripeInitialize } from "@/lib/payments/stripe";

/**
 * Public endpoint — initialises a payment against an existing booking.
 *
 * Flow:
 *   1. Customer completes the booking modal → booking row exists in `pending`
 *   2. Modal POSTs here with the booking reference + chosen provider
 *   3. We pull the site's keys, call the gateway, write a `pending` transaction
 *   4. Return `{ provider, authorization_url? | client_secret? }` to the modal
 *   5. Modal redirects (Paystack) or mounts Stripe Elements
 *   6. After payment the gateway calls our webhook, which flips both rows
 *
 * If `provider` is omitted we pick the first enabled one (Paystack first
 * because it's the dominant pattern in our market).
 */
export async function POST(request: NextRequest) {
  let body: { slug?: string; reference?: string; provider?: "paystack" | "stripe" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const reference = String(body.reference ?? "").trim();
  if (!slug || !reference) {
    return NextResponse.json({ ok: false, error: "Missing slug or reference" }, { status: 400 });
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

  // Pull the booking — the customer email + amount come from here
  const supabase = createServiceClient();
  const { data: booking } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("bookings")
    .select(`
      id, reference, total_cents, currency, customer_id,
      booking_customer:customers!inner(full_name, email, phone)
    `)
    .eq(FK_COL, site.id)
    .eq("reference", reference)
    .maybeSingle();
  if (!booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });

  type Cust = { full_name: string | null; email: string | null; phone: string | null };
  const c: Partial<Cust> =
    (booking as unknown as { booking_customer?: Cust }).booking_customer ?? {};
  const email = c.email;
  if (!email) {
    return NextResponse.json({ ok: false, error: "Booking has no customer email — required for Paystack/Stripe" }, { status: 400 });
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

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
    await withSchema(supabase, BOOKING_SCHEMA).from("transactions").upsert(
      {
        site_id: site.id,
        booking_id: booking.id,
        booking_ref: reference,
        provider: "paystack",
        provider_ref: res.reference,
        amount_cents: booking.total_cents,
        currency: booking.currency,
        status: "pending",
        customer_email: email,
        customer_name: c.full_name,
      },
      { onConflict: "site_id,provider,provider_ref" },
    );
    return NextResponse.json({
      ok: true,
      provider: "paystack",
      authorization_url: res.authorization_url,
      reference: res.reference,
    });
  }

  // ── Stripe ──
  const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
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

  await withSchema(supabase, BOOKING_SCHEMA).from("transactions").upsert(
    {
      site_id: site.id,
      booking_id: booking.id,
      booking_ref: reference,
      provider: "stripe",
      provider_ref: res.session_id,
      amount_cents: booking.total_cents,
      currency: booking.currency,
      status: "pending",
      customer_email: email,
      customer_name: c.full_name,
    },
    { onConflict: "site_id,provider,provider_ref" },
  );
  return NextResponse.json({
    ok: true,
    provider: "stripe",
    publishable_key: provider.publishable_key,
    checkout_url: res.checkout_url,
    session_id: res.session_id,
  });
}
