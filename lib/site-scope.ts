import { createClient } from "@/lib/supabase/server";
import { DB_MODE, FK_COL, getScopeId } from "@/lib/db-scope";

/**
 * Returns the site context for the currently logged-in admin user.
 *
 * Dedicated mode (default):
 *   Auth user exists → pull role from admin_roles table if present.
 *   Scope ID comes from NEXT_PUBLIC_TENANT_ID (no sites-table lookup).
 *
 * Shared mode (NEXT_PUBLIC_DB_MODE=shared, Kodagen DB2):
 *   Looks up kodagen.user_sites → kodagen.sites to get site_id and metadata.
 *
 * Returns null when unauthenticated or the account is disabled.
 * Route handlers / pages should redirect on null.
 */
export async function getCurrentSite() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (DB_MODE === 'dedicated') {
    const scopeId = await getScopeId();

    // admin_roles is optional (not present on auth_strategy="none" sites).
    // If absent the owner is the sole user — grant owner role.
    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq(FK_COL, scopeId)
      .maybeSingle();

    return {
      user,
      userId: user.id,
      siteId: scopeId,
      role:   adminRole?.role ?? 'owner',
      permissions: (adminRole?.permissions ?? {}) as Record<string, unknown>,
      // No sites-directory table in dedicated mode — synthesize from env so the
      // context shape matches shared mode (callers rely on ctx.site being set).
      site: {
        id: scopeId as string,
        slug: process.env.NEXT_PUBLIC_SITE_SLUG ?? "",
        name: "",
        industry: null as string | null,
        status: "active",
        config: {} as Record<string, unknown>,
      },
    };
  }

  // ── Shared mode (Kodagen DB2) ─────────────────────────────────────────────
  //
  // CRITICAL isolation boundary. All shared-mode tenants live in ONE Supabase
  // project, so they share a single auth pool AND the same service-role key —
  // the ONLY thing that keeps tenant A's admin out of tenant B's data is this
  // function returning the correct, membership-verified site.
  //
  // This deployment serves exactly ONE site: NEXT_PUBLIC_SITE_SLUG. We resolve
  // THAT site's id and then require the logged-in user to be an ACTIVE member
  // of it. Never pick "the user's first membership" — because the auth pool is
  // shared, an admin of some OTHER Kodagen site can sign in here with their own
  // credentials, and binding them to their own arbitrary site would (a) show
  // them the wrong site and (b) defeat the per-site gate. A user with no
  // membership to THIS site gets null → redirected to login.
  const scopeId = await getScopeId(); // NEXT_PUBLIC_SITE_SLUG → kodagen.sites.id
  if (!scopeId) return null;

  const { data: mapping, error: mapErr } = await supabase
    .schema("kodagen")
    .from("user_sites")
    .select("role, permissions, active")
    .eq("user_id", user.id)
    .eq("site_id", scopeId)
    .maybeSingle();

  if (mapErr || !mapping) return null;
  if (mapping.active === false) return null;

  // Read the site row with the SAME authenticated cookie client. Membership was
  // just verified above, and kodagen.sites now carries a "members read own site"
  // RLS policy (migration 010) — so no service key is needed to read it.
  const { data: site } = await supabase
    .schema("kodagen")
    .from("sites")
    .select("id, slug, name, industry, status, config")
    .eq("id", scopeId)
    .maybeSingle();

  if (!site) return null;

  return {
    user,
    userId: user.id,
    siteId: scopeId,
    role:   mapping.role as string,
    permissions: (mapping.permissions ?? {}) as Record<string, unknown>,
    site: site as {
      id: string; slug: string; name: string;
      industry: string | null; status: string;
      config: Record<string, unknown>;
    },
  };
}
