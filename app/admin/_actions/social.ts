"use server";
import { FK_COL } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

// Must match the site_social_links.platform CHECK constraint.
// ("use server" files may only export async functions — keep this private.)
const SOCIAL_PLATFORMS = [
  "instagram", "facebook", "twitter", "tiktok", "linkedin",
  "youtube", "whatsapp", "pinterest", "snapchat", "threads",
  "spotify", "soundcloud", "apple_music", "other",
] as const;

async function authorize() {
  const ctx = await getCurrentSite();
  if (!ctx) throw new Error("Not signed in.");
  if (!hasPermission(ctx.role, "content.edit", ctx.permissions)) throw new Error("No permission.");
  return ctx;
}

function revalidate() {
  revalidatePath("/admin/content/social");
  revalidatePath("/", "layout"); // social links render in the public footer
}

export async function saveSocialLink(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "").trim();
    const platform = String(fd.get("platform") ?? "").trim();
    const url = String(fd.get("url") ?? "").trim();
    const displayLabel = String(fd.get("displayLabel") ?? "").trim();

    if (!(SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
      return { ok: false, error: "Pick a platform." };
    }
    if (!/^https?:\/\/.+/.test(url)) {
      return { ok: false, error: "Enter the full URL (starting with https://)." };
    }

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase.from("site_social_links")
        .update({ platform, url, display_label: displayLabel || null })
        .eq("id", id)
        .eq(FK_COL, ctx.siteId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { count } = await supabase.from("site_social_links")
        .select("*", { count: "exact", head: true })
        .eq(FK_COL, ctx.siteId);
      const { error } = await supabase.from("site_social_links").insert({
        [FK_COL]: ctx.siteId,
        platform,
        url,
        display_label: displayLabel || null,
        display_order: count ?? 0,
        is_active: true,
      });
      if (error) return { ok: false, error: error.message };
    }

    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteSocialLink(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { error } = await supabase.from("site_social_links")
      .delete()
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleSocialLink(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "").trim();
    const active = String(fd.get("active") ?? "true") === "true";
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { error } = await supabase.from("site_social_links")
      .update({ is_active: active })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
