import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission, type Permission } from "@/lib/audit";

/**
 * Server-side permission check for actions.
 * Returns the site context if authorized, throws/returns error if not.
 *
 * Usage:
 *   const ctx = await requirePermission("bookings.checkin");
 *   if (!ctx) return { ok: false, error: "No permission." };
 */
export async function requirePermission(permission: Permission) {
  const ctx = await getCurrentSite();
  if (!ctx) return null;
  if (!hasPermission(ctx.role, permission, ctx.permissions)) return null;
  return ctx;
}

/**
 * Checks if the current user has a permission without throwing.
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const ctx = await getCurrentSite();
  if (!ctx) return false;
  return hasPermission(ctx.role, permission, ctx.permissions);
}
