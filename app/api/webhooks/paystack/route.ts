import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { paystackVerify } from "@/lib/payments/paystack";
import { sendEmail } from "@/lib/email/send";
import { fmtMoneyCents } from "@/lib/currency";
import { orderPaymentConfirmedEmail, orderPaymentFailedEmail, orderPaymentFailedAdminEmail } from "@/lib/email/templates";

/**
 * Paystack webhook receiver.
 *
 * Authentication: HMAC-SHA512 of raw body using the site's Paystack secret key,
 * sent as `x-paystack-signature`.
 *
 * Events handled:
 *   charge.success   → mark order paid, insert succeeded transaction
 *   charge.failed    → insert failed transaction
 *   refund.processed → insert refunded transaction
 *
 * Always returns 200 once signature verified — Paystack stops retrying on 200.
 */
export async function POST(request: NextRequest) {
  const rawBody  = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const data      = event.data ?? {};
  const reference = String((data.reference as string | undefined) ?? "").trim();
  if (!reference) {
    return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up the order via the payment reference we stored at init time.
  const { data: order } = await supabase
    .from("orders")
    .select("id, site_id, status, total, notes")
    .eq("payment_ref", reference)
    .maybeSingle();

  if (!order) {
    // Not our reference — acknowledge so Paystack doesn't keep retrying.
    return NextResponse.json({ ok: true, note: "Unknown reference — ignored" });
  }

  const siteId  = order.site_id as string;
  const orderId = order.id     as string;

  // Load the site's Paystack secret key to verify the signature.
  const { data: integration } = await supabase
    .from("integrations_config")
    .select("config, enabled")
    .eq(FK_COL, siteId)
    .eq("kind", "paystack")
    .maybeSingle();

  const cfg       = (integration?.config ?? {}) as Record<string, unknown>;
  const secretKey = typeof cfg.secret_key === "string" ? cfg.secret_key : "";
  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Paystack not configured" }, { status: 400 });
  }

  if (!paystackVerify(rawBody, signature, secretKey)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const eventType   = event.event ?? "";
  const customer    = (data.customer as { email?: string; first_name?: string; last_name?: string } | undefined) ?? {};
  const amount      = Number((data.amount as number | undefined) ?? 0);
  const fees        = Number((data.fees   as number | undefined) ?? 0);
  const providerRef = String((data.id     as number | string | undefined) ?? "");
  const currency    = String((data.currency as string | undefined) ?? (order.notes as string) ?? "EUR").toUpperCase();

  const baseRow = {
    site_id:        siteId,
    order_id:       orderId,
    provider:       "paystack" as const,
    provider_ref:   providerRef || null,
    amount_cents:   amount,
    currency,
    customer_email: customer.email ?? null,
    metadata:       { reference, fees, customer_name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null },
    raw_payload:    data,
  };

  // Load site settings for emails
  const { data: settings } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("site_settings")
    .select("business_name, primary_email")
    .eq(FK_COL, siteId)
    .maybeSingle();

  const siteName   = (settings?.business_name as string) || "Store";
  const adminEmail = (settings?.primary_email  as string) || "";
  const custEmail  = (order.notes as string) !== currency ? (customer.email ?? null) : null; // currency is in notes
  const guestEmail = customer.email ?? null;
  const guestName  = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "there";
  const orderRef   = String(orderId).slice(0, 8).toUpperCase();
  const fmtMoney   = (cents: number) => fmtMoneyCents(cents, currency);

  if (eventType === "charge.success") {
    const now = new Date().toISOString();
    await supabase.from("transactions").upsert(
      { ...baseRow, status: "succeeded", paid_at: now },
      { onConflict: "site_id,provider,provider_ref" },
    );
    if (order.status !== "paid") {
      await supabase.from("orders").update({ status: "paid", paid_at: now }).eq("id", orderId);
    }
    // Email customer: payment confirmed
    if (guestEmail) {
      const tmpl = orderPaymentConfirmedEmail({
        siteName,
        customerName: guestName,
        reference:    orderRef,
        totalFormatted: fmtMoney(amount),
        items: [],
      });
      sendEmail(siteId, { to: guestEmail, ...tmpl, tags: [{ name: "type", value: "payment-confirmed" }] })
        .catch((e) => console.error("[email] payment confirmed:", e));
    }
  } else if (eventType === "charge.failed") {
    const reason = String((data.gateway_response as string | undefined) ?? "Charge failed");
    await supabase.from("transactions").upsert(
      { ...baseRow, status: "failed", error_message: reason },
      { onConflict: "site_id,provider,provider_ref" },
    );
    // Email customer: payment failed
    if (guestEmail) {
      const tmpl = orderPaymentFailedEmail({
        siteName,
        customerName:   guestName,
        reference:      orderRef,
        totalFormatted: fmtMoney(amount),
        reason,
      });
      sendEmail(siteId, { to: guestEmail, ...tmpl, tags: [{ name: "type", value: "payment-failed" }] })
        .catch((e) => console.error("[email] payment failed customer:", e));
    }
    // Alert admin: payment failed
    if (adminEmail) {
      const tmpl = orderPaymentFailedAdminEmail({
        siteName,
        reference:      orderRef,
        customerName:   guestName,
        customerEmail:  guestEmail ?? "",
        totalFormatted: fmtMoney(amount),
        provider:       "Paystack",
        reason,
      });
      sendEmail(siteId, { to: adminEmail, ...tmpl, tags: [{ name: "type", value: "payment-failed-admin" }] })
        .catch((e) => console.error("[email] payment failed admin:", e));
    }
  } else if (eventType === "refund.processed") {
    await supabase.from("transactions").upsert(
      { ...baseRow, status: "refunded" },
      { onConflict: "site_id,provider,provider_ref" },
    );
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  }

  return NextResponse.json({ ok: true });
}
