import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Send a transactional email from a site. Uses:
 *   1. Customer's own Resend API key (if they added one in Integrations), OR
 *   2. A customer-provided RESEND_API_KEY env var (feature gate), OR
 *   3. The Kodagen platform email proxy (KODAGEN_PROXY_URL + site token) —
 *      the platform's master Resend key never ships in this deployment.
 *
 * Sender name = the site's businessName. Reply-to = the site's contact email.
 */
export async function sendEmail(
  siteId: string,
  opts: {
    to: string | string[];
    subject: string;
    html: string;
    /** Override the from name (defaults to the site's businessName) */
    fromName?: string;
    /** Override reply-to */
    replyTo?: string;
    /** Tags for filtering in Resend dashboard */
    tags?: { name: string; value: string }[];
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Resolve email config: customer key → managed key. The service client
  // only exists where the service-role key does (dedicated mode) — shared
  // keyless sites don't ship it, so skip the vault-key/site-settings
  // lookups there and fall straight through to the env key or platform
  // proxy instead of throwing and killing the send entirely.
  let integration: { config: unknown; enabled: boolean | null } | null = null;
  let site: { name: string | null } | null = null;
  let settings: { business_name: string | null; primary_email: string | null } | null = null;
  try {
    const supabase = createServiceClient();
    [{ data: integration }, { data: site }, { data: settings }] = await Promise.all([
      supabase
        .from("integrations_config")
        .select("config, enabled")
        .eq(FK_COL, siteId)
        .eq("kind", "email")
        .maybeSingle(),
      withSchema(supabase, KODAGEN_SCHEMA)
        .from("sites")
        .select("name")
        .eq("id", siteId)
        .maybeSingle(),
      withSchema(supabase, KODAGEN_SCHEMA)
        .from("site_settings")
        .select("business_name, primary_email")
        .eq(FK_COL, siteId)
        .maybeSingle(),
    ]);
  } catch {
    // Shared keyless — the customer vault key can't be read without a
    // DEFINER RPC (future lane); managed sending still works below via
    // the env key or the platform email proxy.
  }

  const cfg = (integration?.config ?? {}) as Record<string, unknown>;
  const contactEmail = (settings?.primary_email as string) ?? "";

  const apiKey = (() => {
    // Customer's own key takes priority if they enabled the integration
    if (integration?.enabled && typeof cfg.api_key === "string" && cfg.api_key.startsWith("re_")) {
      return cfg.api_key;
    }
    // A key the customer supplied via the feature gate (host-written env)
    return process.env.RESEND_API_KEY ?? "";
  })();

  const fromName = opts.fromName ?? (settings?.business_name as string | undefined) ?? (site?.name as string) ?? "Kodagen";

  // No customer key → managed sending via the platform proxy. The proxy holds
  // the master key, applies per-site rate limits, and sends from the managed
  // domain with this site's business name.
  const proxyUrl = process.env.KODAGEN_PROXY_URL;
  const siteToken = process.env.KODAGEN_SITE_TOKEN;
  if (!apiKey && proxyUrl && siteToken) {
    const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
    const replyToAddr = opts.replyTo ?? (contactEmail || undefined);
    try {
      let lastError = "";
      let lastId: string | undefined;
      for (const to of toAddresses) {
        const r = await fetch(`${proxyUrl.replace(/\/$/, "")}/email`, {
          method: "POST",
          headers: { Authorization: `Bearer ${siteToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject: opts.subject, html: opts.html, replyTo: replyToAddr, fromName }),
        });
        const json = (await r.json()) as { ok?: boolean; id?: string; error?: string };
        if (!r.ok || !json.ok) lastError = json.error ?? `proxy ${r.status}`;
        else lastId = json.id;
      }
      if (lastError) {
        console.error("[email] proxy send failed:", lastError);
        return { ok: false, error: lastError };
      }
      return { ok: true, id: lastId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[email] proxy exception:", msg);
      return { ok: false, error: msg };
    }
  }

  if (!apiKey) {
    return { ok: false, error: "No email configured. Enable the Email integration or contact support." };
  }
  // Sending domain priority:
  //   1. Customer's own domain (from their Email integration config)
  //   2. Kodagen's managed domain (RESEND_FROM_DOMAIN env)
  //   3. Resend's test domain (fallback — only delivers to Resend account email)
  const fromDomain = (typeof cfg.from_domain === "string" && cfg.from_domain)
    ? cfg.from_domain
    : process.env.RESEND_FROM_DOMAIN ?? "resend.dev";
  const fromLocal = process.env.RESEND_FROM_LOCAL ?? "noreply";
  const fromAddress = fromDomain === "resend.dev"
    ? `${fromName} <onboarding@resend.dev>`
    : `${fromName} <${fromLocal}@${fromDomain}>`;
  const replyTo = opts.replyTo ?? (contactEmail || undefined);

  const resend = new Resend(apiKey);
  try {
    const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
    console.log(`[email] Sending "${opts.subject}" to ${toAddresses.join(", ")} from ${fromAddress}`);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: toAddresses,
      subject: opts.subject,
      html: opts.html,
      replyTo: replyTo ? [replyTo] : undefined,
      tags: opts.tags,
    });
    if (error) {
      console.error("[email] Send failed:", error.message);
      return { ok: false, error: error.message };
    }
    console.log("[email] Sent:", data?.id);
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] Exception:", msg);
    return { ok: false, error: msg };
  }
}
