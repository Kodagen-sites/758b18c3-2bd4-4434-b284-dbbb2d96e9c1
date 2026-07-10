import { createHmac, timingSafeEqual } from "node:crypto";
import type { LoadedProvider } from "./providers";

const PAYSTACK_API = "https://api.paystack.co";

type PaystackInitInput = {
  amount_cents: number;
  currency: string;
  email: string;
  reference: string;
  callback_url: string;
  metadata: Record<string, unknown>;
};

type PaystackInitResponse =
  | { ok: true; authorization_url: string; access_code: string; reference: string }
  | { ok: false; error: string };

/**
 * Call Paystack's transaction/initialize. Returns the hosted-checkout URL
 * the customer should be redirected to.
 */
export async function paystackInitialize(
  provider: Extract<LoadedProvider, { kind: "paystack" }>,
  input: PaystackInitInput,
): Promise<PaystackInitResponse> {
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.secret_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Paystack wants amount in subunits (kobo for NGN, cents for USD, etc.)
      amount: input.amount_cents,
      currency: provider.currency || input.currency,
      email: input.email,
      reference: input.reference,
      callback_url: input.callback_url,
      metadata: input.metadata,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!res.ok || !json.status || !json.data) {
    return { ok: false, error: json.message ?? `Paystack ${res.status}: ${res.statusText}` };
  }
  return {
    ok: true,
    authorization_url: json.data.authorization_url,
    access_code: json.data.access_code,
    reference: json.data.reference,
  };
}

/**
 * Verify a Paystack webhook payload using the secret key.
 * Paystack sends the signature as `x-paystack-signature: <hex sha512>`.
 */
export function paystackVerify(rawBody: string, signature: string | null, secretKey: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  // Lengths must match before timingSafeEqual won't throw
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Fetch a transaction's authoritative status from Paystack — used to verify
 * after the user is redirected back, in case the webhook hasn't landed yet.
 */
export async function paystackVerifyTransaction(
  provider: Extract<LoadedProvider, { kind: "paystack" }>,
  reference: string,
): Promise<{ ok: boolean; status?: string; amount?: number; fees?: number; raw?: unknown; error?: string }> {
  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${provider.secret_key}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: { status: string; amount: number; fees: number };
  };
  if (!res.ok || !json.status || !json.data) {
    return { ok: false, error: json.message ?? `Paystack verify ${res.status}` };
  }
  return {
    ok: true,
    status: json.data.status,
    amount: json.data.amount,
    fees: json.data.fees,
    raw: json.data,
  };
}
