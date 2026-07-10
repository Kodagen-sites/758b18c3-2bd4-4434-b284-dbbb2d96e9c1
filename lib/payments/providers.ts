import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { createServiceClient } from "@/lib/supabase/server";
import { CURRENCY_CODE } from "@/lib/currency";

/**
 * Loaded provider config for a site — what the booking flow + webhooks read
 * to know which gateway to hit and with what credentials.
 */
export type LoadedProvider =
  | {
      kind: "paystack";
      mode: "test" | "live";
      public_key: string;
      secret_key: string;
      currency: string;
    }
  | {
      kind: "stripe";
      mode: "test" | "live";
      publishable_key: string;
      secret_key: string;
      webhook_secret: string;
      currency: string;
    };

/**
 * Returns every enabled payment provider with all required keys present.
 * If `kind` is passed, returns just that one (or null).
 */
export async function loadEnabledProviders(siteId: string): Promise<LoadedProvider[]> {
  let rows: Array<{ kind: string; config: unknown; enabled: boolean | null }> = [];
  try {
    const supabase = createServiceClient();
    const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
      .from("integrations")
      .select("kind, config, enabled")
      .eq(FK_COL, siteId)
      .in("kind", ["paystack", "stripe"]);
    rows = (data ?? []) as typeof rows;
  } catch {
    // Shared keyless — no service key in the site env, and payment secrets
    // must never be anon-readable. Fetch each provider row through the
    // platform site-proxy, scoped to this site by the HMAC site token.
    rows = (
      await Promise.all(
        (["paystack", "stripe"] as const).map(async (kind) => {
          const row = await loadIntegrationViaProxy(kind);
          return row ? { kind, config: row.config, enabled: row.enabled } : null;
        }),
      )
    ).filter((r): r is { kind: "paystack" | "stripe"; config: unknown; enabled: boolean | null } => r !== null);
  }

  const providers: LoadedProvider[] = [];
  for (const row of rows) {
    if (!row.enabled) continue;
    const cfg = (row.config ?? {}) as Record<string, unknown>;
    const get = (k: string) => (typeof cfg[k] === "string" ? (cfg[k] as string).trim() : "");

    if (row.kind === "paystack" && get("public_key") && get("secret_key")) {
      providers.push({
        kind: "paystack",
        mode: (get("mode") as "test" | "live") || "test",
        public_key: get("public_key"),
        secret_key: get("secret_key"),
        currency: get("currency") || (["NGN", "GHS", "USD", "ZAR", "KES"].includes(CURRENCY_CODE) ? CURRENCY_CODE : "NGN"),
      });
    }
    if (row.kind === "stripe" && get("publishable_key") && get("secret_key")) {
      providers.push({
        kind: "stripe",
        mode: (get("mode") as "test" | "live") || "test",
        publishable_key: get("publishable_key"),
        secret_key: get("secret_key"),
        webhook_secret: get("webhook_secret"),
        currency: get("currency") || "USD",
      });
    }
  }
  return providers;
}

/** Look up a single provider by kind. Returns null if not enabled / missing keys. */
export async function loadProvider(
  siteId: string,
  kind: "paystack" | "stripe",
): Promise<LoadedProvider | null> {
  const all = await loadEnabledProviders(siteId);
  return all.find((p) => p.kind === kind) ?? null;
}

/** Look up a site by slug — used by webhooks that don't have a session. */
export async function getSiteByRef(slug: string): Promise<{ id: string; slug: string } | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
      .from("sites")
      .select("id, slug, status")
      .eq("slug", slug)
      .maybeSingle();
    // Suspended/inactive tenants must not be able to initialize new payments.
    if (!data || data.status !== "active") return null;
    return { id: data.id as string, slug: data.slug as string };
  } catch {
    // Shared keyless — get_public_site (anon-granted DEFINER RPC, migration 010)
    // only returns ACTIVE sites, so the suspended-tenant gate holds.
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
      .rpc("get_public_site", { p_slug: slug });
    const s = Array.isArray(data) ? data[0] : data;
    if (!s?.site_id) return null;
    return { id: s.site_id as string, slug: (s.slug as string) ?? slug };
  }
}

// ── Keyless fallback: fetch one integration row via the platform site-proxy ──
async function loadIntegrationViaProxy(kind: string):
  Promise<{ config: unknown; enabled: boolean | null } | null> {
  const url = process.env.KODAGEN_PROXY_URL;
  const token = process.env.KODAGEN_SITE_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/integration`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { ok?: boolean; enabled?: boolean; config?: unknown };
    if (!json.ok) return null;
    return { config: json.config ?? null, enabled: json.enabled ?? null };
  } catch {
    return null;
  }
}
