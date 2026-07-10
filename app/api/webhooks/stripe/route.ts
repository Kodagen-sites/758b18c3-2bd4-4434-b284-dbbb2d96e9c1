import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripeVerify } from "@/lib/payments/stripe";
import { sendEmail } from "@/lib/email/send";
import { fmtMoneyCents } from "@/lib/currency";
import { orderPaymentConfirmedEmail, orderPaymentFailedEmail, orderPaymentFailedAdminEmail } from "@/lib/email/templates";

/**
 * Stripe webhook receiver.
 *
 * Authentication: Stripe-Signature header verified against the site's
 * webhook_secret using HMAC-SHA256.
 *
 * Events handled:
 *   checkout.session.completed   → mark order paid, insert succeeded transaction
 *   payment_intent.payment_failed → insert failed transaction
 *   charge.refunded              → insert refunded transaction
 *
 * Order lookup: metadata.order_id (set during session creation in /api/payments/initialize).
 */
export async function POST(request: NextRequest) {
  const rawBody   = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const obj      = event.data?.object ?? {};
  const metadata = ((obj as { metadata?: Record<string, string> }).metadata) ?? {};
  const orderId  = metadata.order_id;

  if (!orderId) {
    // Not our session — acknowledge so Stripe stops retrying.
    return NextResponse.json({ ok: true, note: "No order_id in metadata — ignored" });
  }

  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, site_id, status, notes")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: true, note: "Order not found — ignored" });
  }

  const siteId = order.site_id as string;

  // Load the site's Stripe webhook secret.
  const { data: integration } = await supabase
    .from("integrations_config")
    .select("config, enabled")
    .eq(FK_COL, siteId)
    .eq("kind", "stripe")
    .maybeSingle();

  const cfg           = (integration?.config ?? {}) as Record<string, unknown>;
  const webhookSecret = typeof cfg.webhook_secret === "string" ? cfg.webhook_secret : "";
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Stripe webhook secret not configured" }, { status: 400 });
  }

  if (!stripeVerify(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const providerRef  = String((obj as { id?: string }).id ?? "");
  const amountTotal  = Number((obj as { amount_total?: number }).amount_total ?? 0);
  const currency     = String((obj as { currency?: string }).currency ?? (order.notes as string) ?? "eur").toUpperCase();
  const customerEmail = (obj as { customer_email?: string }).customer_email ?? metadata.customer_email ?? null;

  const baseRow = {
    site_id:        siteId,
    order_id:       orderId,
    provider:       "stripe" as const,
    provider_ref:   providerRef || null,
    amount_cents:   amountTotal,
    currency,
    customer_email: customerEmail,
    metadata:       { stripe_event_id: event.id, order_id: orderId },
    raw_payload:    obj,
  };

  // Load site settings for emails
  const { data: settings } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("site_settings")
    .select("business_name, primary_email")
    .eq(FK_COL, siteId)
    .maybeSingle();

  const siteName   = (settings?.business_name as string) || "Store";
  const adminEmail = (settings?.primary_email  as string) || "";
  const guestEmail = customerEmail ?? metadata.customer_email ?? null;
  const orderRef   = String(orderId).slice(0, 8).toUpperCase();
  const fmtMoney   = (cents: number) => fmtMoneyCents(cents, currency);

  if (event.type === "checkout.session.completed") {
    const now = new Date().toISOString();
    await supabase.from("transactions").upsert(
      { ...baseRow, status: "succeeded", paid_at: now },
      { onConflict: "site_id,provider,provider_ref" },
    );
    if (order.status !== "paid") {
      await supabase.from("orders").update({ status: "paid", paid_at: now }).eq("id", orderId);
    }
    if (guestEmail) {
      const tmpl = orderPaymentConfirmedEmail({
        siteName,
        customerName:   metadata.customer_name ?? guestEmail.split("@")[0],
        reference:      orderRef,
        totalFormatted: fmtMoney(amountTotal),
        items: [],
      });
      sendEmail(siteId, { to: guestEmail, ...tmpl, tags: [{ name: "type", value: "payment-confirmed" }] })
        .catch((e) => console.error("[email] stripe payment confirmed:", e));
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const errMsg = ((obj as { last_payment_error?: { message?: string } }).last_payment_error?.message) ?? "Payment failed";
    await supabase.from("transactions").upsert(
      { ...baseRow, status: "failed", error_message: errMsg },
      { onConflict: "site_id,provider,provider_ref" },
    );
    if (guestEmail) {
      const tmpl = orderPaymentFailedEmail({
        siteName,
        customerName:   metadata.customer_name ?? guestEmail.split("@")[0],
        reference:      orderRef,
        totalFormatted: fmtMoney(amountTotal),
        reason:         errMsg,
      });
      sendEmail(siteId, { to: guestEmail, ...tmpl, tags: [{ name: "type", value: "payment-failed" }] })
        .catch((e) => console.error("[email] stripe payment failed customer:", e));
    }
    if (adminEmail) {
      const tmpl = orderPaymentFailedAdminEmail({
        siteName,
        reference:      orderRef,
        customerName:   metadata.customer_name ?? guestEmail?.split("@")[0] ?? "Unknown",
        customerEmail:  guestEmail ?? "",
        totalFormatted: fmtMoney(amountTotal),
        provider:       "Stripe",
        reason:         errMsg,
      });
      sendEmail(siteId, { to: adminEmail, ...tmpl, tags: [{ name: "type", value: "payment-failed-admin" }] })
        .catch((e) => console.error("[email] stripe payment failed admin:", e));
    }
  } else if (event.type === "charge.refunded") {
    await supabase.from("transactions").upsert(
      { ...baseRow, status: "refunded" },
      { onConflict: "site_id,provider,provider_ref" },
    );
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  }

  return NextResponse.json({ ok: true });
}
