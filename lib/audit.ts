import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { FK_COL, KODAGEN_SCHEMA, withSchema } from "@/lib/db-scope";

// Re-export all client-safe types, constants, and functions
export {
  type Role, type Permission, type MaskingConfig,
  ROLE_DEFAULTS, hasPermission,
  maskEmail, maskPhone, maskName, maskAmount,
  getMaskingConfig,
} from "@/lib/audit-shared";

/**
 * Log an admin action for audit trail.
 * Fire-and-forget — never blocks the action itself.
 * SERVER ONLY — do not import this in client components.
 */
export async function logAudit(input: {
  action: string;          // 'booking.create', 'booking.checkin', 'room.update', etc.
  entityType?: string;     // 'booking', 'room', 'inquiry', 'event', 'content', 'team'
  entityId?: string;       // booking reference, room id, etc.
  details?: Record<string, unknown>;
}) {
  try {
    const ctx = await getCurrentSite();
    if (!ctx) return;

    const supabase = await createClient();
    await withSchema(supabase, KODAGEN_SCHEMA)
      .from("audit_log")
      .insert({
        [FK_COL]: ctx.siteId,
        user_id: ctx.user.id,
        user_email: ctx.user.email ?? null,
        user_name: (ctx.user.user_metadata as Record<string, unknown>)?.full_name as string ?? ctx.user.email ?? "Unknown",
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        details: input.details ?? {},
      });
  } catch (e) {
    console.error("[audit] log failed:", e);
  }
}
