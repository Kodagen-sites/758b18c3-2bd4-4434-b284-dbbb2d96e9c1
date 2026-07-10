// lib/payments/report.ts — record payment status (transactions + paid flags).
//
// Two lanes, one call:
//   · service key present (dedicated mode, legacy shared) → direct DB writes,
//     identical to the original webhook behavior.
//   · shared keyless → the platform site-proxy `record-payment` op. The site
//     token is the trust anchor: it lives only in this site's server env —
//     the same place the signature-verified webhook handler runs — and the
//     platform pins every write to the token's own site. Payment writes are
//     never anon-reachable.
//
// Never throws: payment recording is best-effort from the caller's view;
// gateways retry webhooks on a false return.

import { withSchema, BOOKING_SCHEMA } from "@/lib/db-scope";
import { createServiceClient } from "@/lib/supabase/server";

export type PaymentEvent = "initialized" | "paid" | "failed" | "refunded";

export type PaymentRecord = {
  kind: "order" | "booking";
  event: PaymentEvent;
  orderId?: string;
  bookingId?: string;
  bookingRef?: string;
  provider: "paystack" | "stripe";
  providerRef: string;
  amountCents: number;
  currency: string;
  customerEmail?: string | null;
  customerName?: string | null;
  errorMessage?: string | null;
  /** service-lane extras (raw gateway payload etc.) — proxy lane ignores it */
  rawPayload?: unknown;
};

export async function recordPayment(siteId: string, r: PaymentRecord): Promise<boolean> {
  // ── Service lane ──
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();
    const txStatus =
      r.event === "initialized" ? "pending"
      : r.event === "paid" ? "succeeded"
      : r.event === "failed" ? "failed" : "refunded";

    if (r.kind === "order") {
      const { error } = await supabase.from("transactions").upsert({
        site_id: siteId,
        order_id: r.orderId,
        provider: r.provider,
        provider_ref: r.providerRef,
        amount_cents: r.amountCents,
        currency: r.currency,
        status: txStatus,
        customer_email: r.customerEmail ?? null,
        metadata: { customer_name: r.customerName ?? null, order_id: r.orderId },
        raw_payload: r.rawPayload ?? null,
        error_message: r.errorMessage ?? null,
        ...(r.event === "paid" ? { paid_at: now } : {}),
      }, { onConflict: "site_id,provider,provider_ref" });
      if (error) throw new Error(error.message);

      if (r.event === "initialized") {
        await supabase.from("orders")
          .update({ payment_provider: r.provider, payment_ref: r.providerRef })
          .eq("id", r.orderId);
      } else if (r.event === "paid") {
        await supabase.from("orders")
          .update({ status: "paid", paid_at: now, payment_provider: r.provider, payment_ref: r.providerRef })
          .eq("id", r.orderId).neq("status", "paid");
      } else if (r.event === "refunded") {
        await supabase.from("orders").update({ status: "cancelled" }).eq("id", r.orderId);
      }
      return true;
    }

    // booking — no (site,provider,ref) unique constraint on older DBs:
    // select-then-write instead of upsert.
    const tx = withSchema(supabase, BOOKING_SCHEMA).from("transactions");
    const { data: existing } = await withSchema(supabase, BOOKING_SCHEMA).from("transactions")
      .select("id").eq("site_id", siteId).eq("provider", r.provider).eq("provider_ref", r.providerRef).maybeSingle();
    if (existing) {
      await tx.update({
        status: txStatus, amount_cents: r.amountCents, currency: r.currency,
        error_message: r.errorMessage ?? null, ...(r.event === "paid" ? { paid_at: now } : {}),
      }).eq("id", existing.id);
    } else {
      await tx.insert({
        site_id: siteId, booking_id: r.bookingId ?? null, booking_ref: r.bookingRef ?? null,
        provider: r.provider, provider_ref: r.providerRef,
        amount_cents: r.amountCents, currency: r.currency, status: txStatus,
        customer_email: r.customerEmail ?? null, customer_name: r.customerName ?? null,
        error_message: r.errorMessage ?? null, ...(r.event === "paid" ? { paid_at: now } : {}),
      });
    }
    if (r.event === "paid" && (r.bookingId || r.bookingRef)) {
      let q = withSchema(supabase, BOOKING_SCHEMA).from("bookings")
        .update({ state: "confirmed", paid_cents: r.amountCents, payment_provider: r.provider, payment_ref: r.providerRef });
      q = r.bookingId ? q.eq("id", r.bookingId) : q.eq("reference", r.bookingRef).eq("site_id", siteId);
      await q;
    }
    return true;
  } catch {
    // fall through to the proxy lane
  }

  // ── Proxy lane (shared keyless) ──
  const url = process.env.KODAGEN_PROXY_URL;
  const token = process.env.KODAGEN_SITE_TOKEN;
  if (!url || !token) return false;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/record-payment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: r.kind, event: r.event,
        orderId: r.orderId, bookingId: r.bookingId, bookingRef: r.bookingRef,
        provider: r.provider, providerRef: r.providerRef,
        amountCents: r.amountCents, currency: r.currency,
        customerEmail: r.customerEmail ?? null, customerName: r.customerName ?? null,
        errorMessage: r.errorMessage ?? null,
      }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return Boolean(json?.ok);
  } catch {
    return false;
  }
}
