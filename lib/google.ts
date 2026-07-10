import { createSign } from "node:crypto";
import { FK_COL, KODAGEN_SCHEMA, withSchema } from "@/lib/db-scope";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Google service-account integrations (Sheets + Calendar) — no SDK, no OAuth
 * dance. The owner creates a service account, pastes its JSON key into
 * /admin/integrations, and shares the target spreadsheet/calendar with the
 * service-account email. We sign a JWT with the key and call the REST APIs.
 *
 * Everything here is BEST-EFFORT: callers fire these after the primary write
 * succeeded and must never fail the request on a Google error.
 */

type ServiceAccount = { client_email: string; private_key: string };

function parseServiceAccount(raw: unknown): ServiceAccount | null {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    const email = String((obj as Record<string, unknown>)?.client_email ?? "");
    const key = String((obj as Record<string, unknown>)?.private_key ?? "");
    if (!email || !key.includes("PRIVATE KEY")) return null;
    return { client_email: email, private_key: key };
  } catch {
    return null;
  }
}

const b64url = (s: string | Buffer) =>
  Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function getAccessToken(sa: ServiceAccount, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(sa.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google token exchange returned no access_token.");
  return json.access_token;
}

/** Load an enabled Google integration's config for this site, or null. */
async function loadIntegration(siteId: string, kind: "google_sheets" | "google_calendar"):
  Promise<{ sa: ServiceAccount; config: Record<string, unknown> } | null> {
  let row: { config: unknown; enabled: boolean | null } | null = null;
  try {
    const supabase = createServiceClient();
    const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
      .from("integrations")
      .select("config, enabled")
      .eq(FK_COL, siteId)
      .eq("kind", kind)
      .maybeSingle();
    row = data ?? null;
  } catch {
    // Shared keyless — no service key in the site env. The callers run in anon
    // request context (public inquiry/booking POSTs), so the row can't be read
    // via RLS either; fetch it through the platform site-proxy, scoped to this
    // site by the HMAC site token.
    row = await loadIntegrationViaProxy(kind);
  }
  if (!row?.enabled) return null;
  const config = (row.config ?? {}) as Record<string, unknown>;
  const sa = parseServiceAccount(config.service_account_json);
  if (!sa) return null;
  return { sa, config };
}

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

/**
 * Append one row to the connected spreadsheet. No-ops (returns false) when
 * the integration is off or misconfigured; throws only never.
 */
export async function googleSheetsAppendRow(siteId: string, values: (string | number)[]): Promise<boolean> {
  try {
    const integ = await loadIntegration(siteId, "google_sheets");
    if (!integ) return false;
    const spreadsheetId = String(integ.config.spreadsheet_id ?? "").trim();
    if (!spreadsheetId) return false;
    const sheetName = String(integ.config.sheet_name ?? "").trim() || "Sheet1";

    const token = await getAccessToken(integ.sa, "https://www.googleapis.com/auth/spreadsheets");
    const range = encodeURIComponent(`${sheetName}!A1`);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [values] }),
      },
    );
    if (!res.ok) throw new Error(`Sheets append failed (${res.status}): ${await res.text()}`);
    return true;
  } catch (e) {
    console.error("[google_sheets] append failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Create an event on the connected calendar (booking/appointment sync).
 * No-ops (returns false) when the integration is off or misconfigured.
 */
export async function googleCalendarCreateEvent(siteId: string, event: {
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  attendeeEmail?: string;
}): Promise<boolean> {
  try {
    const integ = await loadIntegration(siteId, "google_calendar");
    if (!integ) return false;
    const calendarId = String(integ.config.calendar_id ?? "").trim();
    if (!calendarId) return false;
    const timezone = String(integ.config.timezone ?? "").trim() || "UTC";

    const token = await getAccessToken(integ.sa, "https://www.googleapis.com/auth/calendar.events");
    const body: Record<string, unknown> = {
      summary: event.summary,
      description: event.description ?? "",
      start: { dateTime: event.startIso, timeZone: timezone },
      end: { dateTime: event.endIso, timeZone: timezone },
    };
    // Service accounts can't invite attendees without domain-wide delegation —
    // put the customer's email in the description instead of an attendee list.
    if (event.attendeeEmail) {
      body.description = `${body.description ? `${body.description}\n` : ""}Customer: ${event.attendeeEmail}`;
    }
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error(`Calendar insert failed (${res.status}): ${await res.text()}`);
    return true;
  } catch (e) {
    console.error("[google_calendar] event failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
