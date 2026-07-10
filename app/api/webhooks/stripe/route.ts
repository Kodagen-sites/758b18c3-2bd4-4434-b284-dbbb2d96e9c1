import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripeVerify } from "@/lib/payments/stripe";
import { loadProvider } from "@/lib/payments/providers";
import { recordPayment } from "@/lib/payments/report";
import { sendEmail } from "@/lib/email/send";
import { fmtMoneyCents } from "@/lib/currency";
import { orderPaymentConfirmedEmail, orderPaymentFailedEmail, orderPaymentFailedAdminEmail } from "@/lib/email/templates";

/**
 * Stripe webhook receiver.
 *
 * Authentication: Stripe-Signature header verified against the site's
 * webhook_secret (tenant-pasted, read via lib/payments/providers — which
 * resolves keyless through the platform integration proxy).
 *
 * Events handled:
 *   checkout.session.completed    → mark order paid, succeeded transaction
 *   payment_intent.payment_failed → failed transaction
 *   charge.refunded               → refunded transaction, order cancelled
 *
 * Order lookup: metadata.order_id (set during session creation in
 * /api/payments/initialize). Writes flow through recordPayment — direct in
 * dedicated mode, via the platform site-proxy keyless (payment writes are
 * never anon-reachable).
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

  let svc: ReturnType<typeof createServiceClient> | null = null;
  try { svc = createServiceClient(); } catch { svc = null; }

  const slug = process.env.NEXT_PUBLIC_SITE_SLUG ?? "";
  let order: { id: string; site_id: string; status: string; notes: string | null } | null = null;
  if (svc) {
    const { data } = await svc.from("orders")
      .select("id, site_id, status, notes").eq("id", orderId).maybeSingle();
    order = (data as typeof order) ?? null;
  } else {
    const anon = await createClient();
    const { data } = await anon.rpc("get_order_public", { p_slug: slug, p_order_id: orderId });
    const o = data as Record<string, unknown> | null;
    if (o?.id) {
      order = { id: o.id as string, site_id: o.site_id as string, status: (o.status as string) ?? "pending", notes: (o.notes as string) ?? null };
    }
  }

  if (!order) {
    return NextResponse.json({ ok: true, note: "Order not found — ignored" });
  }

  const siteId = order.site_id;

  // The site's Stripe webhook secret — tenant-pasted in /admin/integrations.
  const provider = await loadProvider(siteId, "stripe");
  const webhookSecret = provider?.kind === "stripe" ? provider.webhook_secret : "";
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Stripe webhook secret not configured" }, { status: 400 });
  }

  if (!stripeVerify(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const providerRef  = String((obj as { id?: string }).id ?? "");
  const amountTotal  = Number((obj as { amount_total?: number }).amount_total ?? 0);
  const currency     = String((obj as { currency?: string }).currency ?? order.notes ?? "eur").toUpperCase();
  const customerEmail = (obj as { customer_email?: string }).customer_email ?? metadata.customer_email ?? null;

  // Load site brand/contact for emails
  let siteName = "Store";
  let adminEmail = "";
  if (svc) {
    const { data: settings } = await withSchema(svc, KODAGEN_SCHEMA)
      .from("site_settings").select("business_name, primary_email").eq(FK_COL, siteId).maybeSingle();
    siteName = (settings?.business_name as string) || "Store";
    adminEmail = (settings?.primary_email as string) || "";
  } else {
    const anon = await createClient();
    const { data } = await withSchema(anon, KODAGEN_SCHEMA).rpc("get_public_site", { p_slug: slug });
    const s = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    siteName = (s?.business_name as string) || (s?.name as string) || "Store";
    adminEmail = (s?.primary_email as string) || "";
  }

  const guestEmail = customerEmail ?? metadata.customer_email ?? null;
  const orderRef   = String(orderId).slice(0, 8).toUpperCase();
  const fmtMoney   = (cents: number) => fmtMoneyCents(cents, currency);

  if (event.type === "checkout.session.completed") {
    await recordPayment(siteId, {
      kind: "order", event: "paid", orderId,
      provider: "stripe", providerRef,
      amountCents: amountTotal, currency,
      customerEmail: guestEmail, customerName: metadata.customer_name ?? null,
      rawPayload: obj,
    });
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
    await recordPayment(siteId, {
      kind: "order", event: "failed", orderId,
      provider: "stripe", providerRef,
      amountCents: amountTotal, currency,
      customerEmail: guestEmail, customerName: metadata.customer_name ?? null,
      errorMessage: errMsg, rawPayload: obj,
    });
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
    await recordPayment(siteId, {
      kind: "order", event: "refunded", orderId,
      provider: "stripe", providerRef,
      amountCents: amountTotal, currency,
      customerEmail: guestEmail, rawPayload: obj,
    });
  }

  return NextResponse.json({ ok: true });
}
