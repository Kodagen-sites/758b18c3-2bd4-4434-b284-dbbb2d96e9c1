import { createHmac, timingSafeEqual } from "node:crypto";
import type { LoadedProvider } from "./providers";

const STRIPE_API = "https://api.stripe.com/v1";
const SIG_TOLERANCE_SECONDS = 5 * 60; // reject events older than 5min

type StripeInitInput = {
  amount_cents: number;
  currency: string;
  email: string;
  reference: string;
  description: string;
  metadata: Record<string, string>;
  success_url: string;
  cancel_url: string;
};

type StripeInitResponse =
  | { ok: true; checkout_url: string; session_id: string }
  | { ok: false; error: string };

/**
 * Create a Stripe Checkout Session (hosted page). The customer is redirected
 * to Stripe's hosted checkout — same UX pattern as Paystack. No need to mount
 * Stripe Elements or load stripe.js on the client.
 *
 * After payment, Stripe redirects to success_url. The webhook fires
 * checkout.session.completed which we handle the same as payment_intent.succeeded.
 */
export async function stripeInitialize(
  provider: Extract<LoadedProvider, { kind: "stripe" }>,
  input: StripeInitInput,
): Promise<StripeInitResponse> {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", input.email);
  body.set("line_items[0][price_data][currency]", (provider.currency || input.currency).toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(input.amount_cents));
  body.set("line_items[0][price_data][product_data][name]", input.description);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", input.success_url);
  body.set("cancel_url", input.cancel_url);
  body.set("metadata[booking_reference]", input.reference);
  for (const [k, v] of Object.entries(input.metadata)) {
    body.set(`metadata[${k}]`, v);
  }

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.secret_key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!res.ok || !json.id || !json.url) {
    return { ok: false, error: json.error?.message ?? `Stripe ${res.status}` };
  }
  return { ok: true, checkout_url: json.url, session_id: json.id };
}

/**
 * Verify a Stripe webhook signature. The Stripe-Signature header looks like
 *   t=1492774577,v1=5257a...,v0=...
 * We HMAC-SHA256(webhook_secret, `${t}.${rawBody}`) and timing-safe compare
 * to v1, with a tolerance window so replay attacks beyond 5min are rejected.
 */
export function stripeVerify(rawBody: string, signatureHeader: string | null, webhookSecret: string): boolean {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("=")) as [string, string][],
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > SIG_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", webhookSecret).update(`${t}.${rawBody}`).digest("hex");
  if (expected.length !== v1.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

/** Look up a Checkout Session — used to verify payment after redirect. */
export async function stripeRetrieveCheckoutSession(
  provider: Extract<LoadedProvider, { kind: "stripe" }>,
  sessionId: string,
): Promise<{ ok: boolean; paid: boolean; amount?: number; raw?: unknown; error?: string }> {
  const res = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${provider.secret_key}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    payment_status?: string;
    amount_total?: number;
    error?: { message?: string };
  };
  if (!res.ok || !json.payment_status) return { ok: false, paid: false, error: json.error?.message ?? `Stripe ${res.status}` };
  return { ok: true, paid: json.payment_status === "paid", amount: json.amount_total, raw: json };
}

/** Look up a PaymentIntent — used to verify the latest status after redirect. */
export async function stripeRetrievePaymentIntent(
  provider: Extract<LoadedProvider, { kind: "stripe" }>,
  paymentIntentId: string,
): Promise<{ ok: boolean; status?: string; amount?: number; raw?: unknown; error?: string }> {
  const res = await fetch(`${STRIPE_API}/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
    headers: { Authorization: `Bearer ${provider.secret_key}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    amount?: number;
    error?: { message?: string };
  };
  if (!res.ok || !json.status) return { ok: false, error: json.error?.message ?? `Stripe ${res.status}` };
  return { ok: true, status: json.status, amount: json.amount, raw: json };
}
