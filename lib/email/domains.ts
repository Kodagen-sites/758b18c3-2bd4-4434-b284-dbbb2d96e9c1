import { Resend } from "resend";

/**
 * Resend domain management — auto-configure a customer's domain so emails
 * come from their own address (noreply@theirdomain.com).
 *
 * Flow:
 *   1. Admin enters their domain in /admin/integrations → Email tab
 *   2. We call Resend's API to register the domain → get DNS records back
 *   3. Admin adds the DNS records (we show them with copy buttons)
 *   4. Admin clicks "Verify" → we call Resend to check
 *   5. Once verified, emails send from their domain automatically
 *
 * All using YOUR single Resend API key — no per-customer key needed.
 */

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

export type DomainRecord = {
  type: string;      // TXT, CNAME, MX
  name: string;      // host / record name
  value: string;     // record value
  status: string;    // pending, verified, failed
  priority?: number; // for MX records
};

export type DomainSetupResult =
  | { ok: true; id: string; status: string; records: DomainRecord[] }
  | { ok: false; error: string };

/**
 * Register a new domain with Resend. Returns the DNS records the customer
 * needs to add to their domain's DNS settings.
 */
export async function addDomain(domain: string): Promise<DomainSetupResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.domains.create({ name: domain });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "No data returned from Resend" };

    // Extract the DNS records Resend wants the customer to add
    const records: DomainRecord[] = (data.records ?? []).map((r: {
      record: string; name: string; value: string; status: string; priority?: number;
    }) => ({
      type: r.record,
      name: r.name,
      value: r.value,
      status: r.status,
      priority: r.priority,
    }));

    return {
      ok: true,
      id: data.id,
      status: data.status,
      records,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Check if a domain's DNS records have been verified by Resend.
 */
export async function verifyDomain(domainId: string): Promise<DomainSetupResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.domains.verify(domainId);
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "No data returned" };

    // Re-fetch domain to get updated record statuses
    const { data: domain, error: getErr } = await resend.domains.get(domainId);
    if (getErr || !domain) return { ok: false, error: getErr?.message ?? "Failed to fetch domain" };

    const records: DomainRecord[] = (domain.records ?? []).map((r: {
      record: string; name: string; value: string; status: string; priority?: number;
    }) => ({
      type: r.record,
      name: r.name,
      value: r.value,
      status: r.status,
      priority: r.priority,
    }));

    return {
      ok: true,
      id: domain.id,
      status: domain.status,
      records,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * List all domains registered with the Resend account.
 */
export async function listDomains(): Promise<{ id: string; name: string; status: string }[]> {
  try {
    const resend = getResend();
    const { data } = await resend.domains.list();
    return (data?.data ?? []).map((d: { id: string; name: string; status: string }) => ({
      id: d.id,
      name: d.name,
      status: d.status,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete a domain from Resend.
 */
export async function removeDomain(domainId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    const { error } = await resend.domains.remove(domainId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
