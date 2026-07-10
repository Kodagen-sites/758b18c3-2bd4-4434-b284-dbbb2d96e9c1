"use server";
import { FK_COL } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function authorize() {
  const ctx = await getCurrentSite();
  if (!ctx) throw new Error("Not signed in.");
  if (!hasPermission(ctx.role, "content.edit", ctx.permissions)) throw new Error("No permission.");
  return ctx;
}

/** Update one site_pages row — per-page SEO, hero overrides, visibility. */
export async function updateSitePage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing page id." };

    const str = (k: string) => {
      const v = String(fd.get(k) ?? "").trim();
      return v || null;
    };
    const bool = (k: string) => String(fd.get(k) ?? "") === "on";

    const supabase = await createClient();
    const { data: page, error } = await supabase.from("site_pages")
      .update({
        meta_title: str("metaTitle"),
        meta_description: str("metaDescription"),
        hero_headline_override: str("heroHeadline"),
        hero_subhead_override: str("heroSubhead"),
        is_published: bool("isPublished"),
        is_indexed: bool("isIndexed"),
        is_in_nav: bool("isInNav"),
      })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId)
      .select("slug")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!page) return { ok: false, error: "Page not found." };

    revalidatePath("/admin/content/pages");
    revalidatePath("/", "layout"); // page meta/hero feed the public site
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
