"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { ensureStaffUser, setStaffPassword } from "@/lib/staff-proxy";
import { logAudit, type Role, ROLE_DEFAULTS } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Create a new team member — creates a Supabase auth user + maps them to the site.
 */
export async function createTeamMember(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, error: "Only owners and admins can manage team." };

  const email    = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "").trim();
  const name     = String(fd.get("name") ?? "").trim();
  const role     = String(fd.get("role") ?? "receptionist").trim() as Role;

  if (!email || !password) return { ok: false, error: "Email and password are required." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const validRoles = ["owner", "admin", "general_manager", "front_office_manager", "supervisor", "receptionist", "night_auditor", "concierge", "housekeeping", "accountant", "viewer"];
  if (!validRoles.includes(role)) {
    return { ok: false, error: "Invalid role." };
  }

  const supabase = await createClient();

  // Create-or-find the GoTrue user via the platform staff proxy (the service
  // key that GoTrue admin needs is never shipped to this site). The proxy
  // returns the user id; for an existing account it does NOT reset the password.
  const ensured = await ensureStaffUser(email, password);
  if (!ensured.ok || !ensured.userId) {
    return { ok: false, error: ensured.ok ? "Could not create user." : ensured.error };
  }
  const userId = ensured.userId;

  // Already on this team? (membership read is allowed by RLS)
  const { data: mapping } = await withSchema(supabase, KODAGEN_SCHEMA).from("user_sites")
    .select("user_id").eq("user_id", userId).eq(FK_COL, ctx.siteId).maybeSingle();
  if (mapping) return { ok: false, error: "This user is already on your team." };

  // Data masking preferences
  const unmaskEmail = String(fd.get("unmask_email") ?? "false") === "on";
  const unmaskPhone = String(fd.get("unmask_phone") ?? "false") === "on";
  const unmaskName  = String(fd.get("unmask_name") ?? "true") === "on";
  const seeRevenue  = String(fd.get("see_revenue") ?? "false") === "on";

  // Map to site
  const { error: mapErr } = await withSchema(supabase, KODAGEN_SCHEMA).from("user_sites").insert({
    user_id: userId,
    site_id: ctx.siteId,
    role,
    display_name: name || email.split("@")[0],
    permissions: {
      permissions: ROLE_DEFAULTS[role],
      masking: { unmaskEmail, unmaskPhone, unmaskName, seeRevenue },
    },
    active: true,
  });
  if (mapErr) return { ok: false, error: mapErr.message };

  logAudit({ action: "team.create", entityType: "team", entityId: email, details: { name, role } });
  revalidatePath("/admin/team");
  return { ok: true };
}

/**
 * Update a team member's role and permissions.
 */
export async function updateTeamMember(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, error: "No permission." };

  const userId = String(fd.get("userId") ?? "");
  const role   = String(fd.get("role") ?? "") as Role;
  const name   = String(fd.get("name") ?? "").trim();
  const active = String(fd.get("active") ?? "true") === "true";

  if (!userId) return { ok: false, error: "Missing user." };

  // Can't change own role
  if (userId === ctx.user.id) return { ok: false, error: "You can't change your own role." };

  const unmaskEmail = String(fd.get("unmask_email") ?? "false") === "on";
  const unmaskPhone = String(fd.get("unmask_phone") ?? "false") === "on";
  const unmaskName  = String(fd.get("unmask_name") ?? "false") === "on";
  const seeRevenue  = String(fd.get("see_revenue") ?? "false") === "on";

  const supabase = await createClient();
  const { error } = await withSchema(supabase, KODAGEN_SCHEMA).from("user_sites")
    .update({
      role,
      display_name: name || undefined,
      permissions: {
        permissions: ROLE_DEFAULTS[role],
        masking: { unmaskEmail, unmaskPhone, unmaskName, seeRevenue },
      },
      active,
    })
    .eq("user_id", userId)
    .eq(FK_COL, ctx.siteId);
  if (error) return { ok: false, error: error.message };

  logAudit({ action: "team.update", entityType: "team", entityId: userId, details: { role, name, active } });
  revalidatePath("/admin/team");
  return { ok: true };
}

/**
 * Remove a team member from the site (doesn't delete their auth account).
 */
export async function removeTeamMember(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, error: "No permission." };

  const userId = String(fd.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };
  if (userId === ctx.user.id) return { ok: false, error: "You can't remove yourself." };

  const supabase = await createClient();
  const { error } = await withSchema(supabase, KODAGEN_SCHEMA).from("user_sites")
    .delete().eq("user_id", userId).eq(FK_COL, ctx.siteId);
  if (error) return { ok: false, error: error.message };

  logAudit({ action: "team.remove", entityType: "team", entityId: userId });
  revalidatePath("/admin/team");
  return { ok: true };
}

/**
 * Reset a team member's password.
 */
export async function resetTeamPassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, error: "No permission." };

  const userId   = String(fd.get("userId") ?? "");
  const password = String(fd.get("password") ?? "").trim();
  if (!userId || !password) return { ok: false, error: "Missing fields." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const supabase = await createClient();

  // Membership guard — the target MUST be a team member of THIS site before we
  // touch their (shared, global) auth password. Without this an owner/admin of
  // site A could reset any user's password by id, including another tenant's
  // owner → cross-tenant account takeover. The platform proxy ALSO re-verifies
  // this server-side; this is the first line of defence.
  const { data: membership } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("user_sites")
    .select("user_id")
    .eq("user_id", userId)
    .eq(FK_COL, ctx.siteId)
    .maybeSingle();
  if (!membership) return { ok: false, error: "That user isn't a member of this site." };

  const result = await setStaffPassword(userId, password);
  if (!result.ok) return { ok: false, error: result.error };

  logAudit({ action: "team.reset_password", entityType: "team", entityId: userId });
  return { ok: true };
}
