// lib/staff-proxy.ts
//
// Client for the platform site-proxy's staff endpoint. In shared (Kodagen DB2)
// mode the site holds NO service key, so the two GoTrue-admin staff operations
// that genuinely need it — creating an auth user and setting a password — route
// through the platform, which holds the key server-side and scopes every call
// to this site via the HMAC site token. Everything else (listing members, role
// changes, removal) is plain membership-RLS'd SQL on kodagen.user_sites.

type StaffResult =
  | { ok: true; userId?: string; created?: boolean }
  | { ok: false; error: string };

function proxy(): { url: string; token: string } | null {
  const url = process.env.KODAGEN_PROXY_URL;
  const token = process.env.KODAGEN_SITE_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function call(body: Record<string, unknown>): Promise<StaffResult> {
  const p = proxy();
  if (!p) return { ok: false, error: "Staff management isn't available on this site yet." };
  try {
    const r = await fetch(`${p.url}/staff`, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await r.json()) as StaffResult;
    if (!r.ok && (json as { error?: string }).error) return { ok: false, error: (json as { error: string }).error };
    return json;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Find-or-create a GoTrue user for a staff invite. Returns their user id.
 *  For an EXISTING account the password is left untouched (no takeover). */
export function ensureStaffUser(email: string, password: string): Promise<StaffResult> {
  return call({ op: "ensureUser", email, password });
}

/** Set a staff member's password. The platform re-verifies they are a member of
 *  this site before touching the shared, global password. */
export function setStaffPassword(userId: string, password: string): Promise<StaffResult> {
  return call({ op: "setPassword", userId, password });
}
