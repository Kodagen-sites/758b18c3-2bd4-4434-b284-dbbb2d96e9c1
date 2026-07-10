import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { paystackVerify } from "@/lib/payments/paystack";
import { loadProvider } from "@/lib/payments/providers";
import { recordPayment } from "@/lib/payments/report";
import { sendEmail } from "@/lib/email/send";
import { fmtMoneyCents } from "@/lib/currency";
import { orderPaymentConfirmedEmail, orderPaymentFailedEmail, orderPaymentFailedAdminEmail } from "@/lib/email/templates";

/**
 * Paystack webhook receiver.
 *
 * Authentication: HMAC-SHA512 of raw body using the site's Paystack secret key
 * (tenant-pasted, read via lib/payments/providers — keyless-safe through the
 * platform integration proxy), sent as `x-paystack-signature`.
 *
 * Events handled:
 *   charge.success   → mark order paid, succeeded transaction
 *   charge.failed    → failed transaction
 *   refund.processed → refunded transaction, order cancelled
 *
 * Order lookup: metadata.order_id (set at init), falling back to the
 * payment_ref stamped on the order (service-key mode only). Writes flow
 * through recordPayment — direct in dedicated mode, via the platform
 * site-proxy keyless.
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
  const metadata  = (data.metadata as Record<string, unknown> | undefined) ?? {};
  if (!reference) {
    return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
  }

  let svc: ReturnType<typeof createServiceClient> | null = null;
  try { svc = createServiceClient(); } catch { svc = null; }
  const slug = process.env.NEXT_PUBLIC_SITE_SLUG ?? "";

  // Which order is this? metadata.order_id (set at init) is the primary key
  // into our world; ORD-<uuid> references carry it too. The legacy
  // payment_ref lookup needs the service key.
  let orderIdHint = String(metadata.order_id ?? "").trim();
  if (!orderIdHint && /^ORD-[0-9a-f-]{36}$/i.test(reference)) {
    orderIdHint = reference.slice(4);
  }

  let order: { id: string; site_id: string; status: string; notes: string | null } | null = null;
  if (svc) {
    let q = svc.from("orders").select("id, site_id, status, notes");
    q = orderIdHint ? q.eq("id", orderIdHint) : q.eq("payment_ref", reference);
    const { data: o } = await q.maybeSingle();
    order = (o as typeof order) ?? null;
  } else if (orderIdHint) {
    const anon = await createClient();
    const { data: o } = await anon.rpc("get_order_public", { p_slug: slug, p_order_id: orderIdHint });
    const r = o as Record<string, unknown> | null;
    if (r?.id) {
      order = { id: r.id as string, site_id: r.site_id as string, status: (r.status as string) ?? "pending", notes: (r.notes as string) ?? null };
    }
  }

  if (!order) {
    // Not our reference — acknowledge so Paystack doesn't keep retrying.
    return NextResponse.json({ ok: true, note: "Unknown reference — ignored" });
  }

  const siteId  = order.site_id;
  const orderId = order.id;

  // The site's Paystack secret key — tenant-pasted in /admin/integrations.
  const provider = await loadProvider(siteId, "paystack");
  const secretKey = provider?.kind === "paystack" ? provider.secret_key : "";
  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Paystack not configured" }, { status: 400 });
  }

  if (!paystackVerify(rawBody, signature, secretKey)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const eventType   = event.event ?? "";
  const customer    = (data.customer as { email?: string; first_name?: string; last_name?: string } | undefined) ?? {};
  const amount      = Number((data.amount as number | undefined) ?? 0);
  const providerRef = String((data.id     as number | string | undefined) ?? "");
  const currency    = String((data.currency as string | undefined) ?? order.notes ?? "EUR").toUpperCase();
  const guestName   = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "there";

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
    const { data: s0 } = await withSchema(anon, KODAGEN_SCHEMA).rpc("get_public_site", { p_slug: slug });
    const s = (Array.isArray(s0) ? s0[0] : s0) as Record<string, unknown> | null;
    siteName = (s?.business_name as string) || (s?.name as string) || "Store";
    adminEmail = (s?.primary_email as string) || "";
  }

  const guestEmail = customer.email ?? null;
  const orderRef   = String(orderId).slice(0, 8).toUpperCase();
  const fmtMoney   = (cents: number) => fmtMoneyCents(cents, currency);

  if (eventType === "charge.success") {
    await recordPayment(siteId, {
      kind: "order", event: "paid", orderId,
      provider: "paystack", providerRef: providerRef || reference,
      amountCents: amount, currency,
      customerEmail: guestEmail, customerName: guestName,
      rawPayload: data,
    });
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
    await recordPayment(siteId, {
      kind: "order", event: "failed", orderId,
      provider: "paystack", providerRef: providerRef || reference,
      amountCents: amount, currency,
      customerEmail: guestEmail, customerName: guestName,
      errorMessage: reason, rawPayload: data,
    });
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
    await recordPayment(siteId, {
      kind: "order", event: "refunded", orderId,
      provider: "paystack", providerRef: providerRef || reference,
      amountCents: amount, currency,
      customerEmail: guestEmail, rawPayload: data,
    });
  }

  return NextResponse.json({ ok: true });
}
