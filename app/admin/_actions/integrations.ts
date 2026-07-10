"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type SaveResult = { ok: true } | { ok: false; error: string };

const ALLOWED_KINDS = new Set([
  "paystack", "stripe",
  "ga4", "meta_pixel", "gtm",
  "email", "whatsapp", "tawkto",
  "custom_script", "body_script",
]);

/**
 * Upsert one integration row into kodagen.integrations. The form serialises
 * its fields as JSON in a hidden "config" input, plus a separate "kind" and
 * "enabled" input. The display_name comes from the same form so the admin can
 * rename if they want.
 */
export async function saveIntegration(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "integrations.edit", ctx.permissions)) {
    return { ok: false, error: "You don't have permission to edit integrations." };
  }

  const kind = String(fd.get("kind") ?? "").trim();
  const display_name = String(fd.get("display_name") ?? "").trim();
  const enabled = String(fd.get("enabled") ?? "false") === "true";
  const configRaw = String(fd.get("config") ?? "{}");

  if (!ALLOWED_KINDS.has(kind)) return { ok: false, error: `Unknown integration "${kind}".` };

  let config: Record<string, unknown>;
  try {
    const parsed = JSON.parse(configRaw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Config must be an object.");
    }
    config = parsed as Record<string, unknown>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid config JSON." };
  }

  const supabase = await createClient();

  // Use upsert on (site_id, kind) — table has a unique constraint on the pair.
  const { error } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("integrations")
    .upsert(
      { site_id: ctx.siteId, kind, display_name: display_name || kind, config, enabled },
      { onConflict: "site_id,kind" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/integrations");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
