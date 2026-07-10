"use server";
import { FK_COL } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function authorize() {
  const ctx = await getCurrentSite();
  if (!ctx) throw new Error("Not signed in.");
  if (!hasPermission(ctx.role, "testimonials.edit", ctx.permissions)) throw new Error("No permission.");
  return ctx;
}

function bumpAll() {
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/about");
  revalidatePath("/");
}

export async function createTestimonial(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const author_name = String(fd.get("author_name") ?? "").trim();
    const author_role = String(fd.get("author_role") ?? "").trim() || null;
    const author_avatar = String(fd.get("author_avatar") ?? "").trim() || null;
    const quote = String(fd.get("body") ?? "").trim();
    const rating = Math.max(1, Math.min(5, Number(fd.get("rating") ?? 5)));
    const is_featured = String(fd.get("featured") ?? "false") === "true";
    const sort_order = Number(fd.get("sort_order") ?? 0);

    if (!author_name) return { ok: false, error: "Author name is required." };
    if (!quote) return { ok: false, error: "Review text is required." };

    const supabase = await createClient();
    const { data, error } = await supabase

      .from("testimonials")
      .insert({
        site_id: ctx.siteId,
        author_name,
        author_role,
        author_avatar,
        quote,
        rating,
        is_featured,
        is_approved: true,
        sort_order,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    bumpAll();
    return { ok: true, id: data?.id as string | undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateTestimonial(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing id." };

    const author_name = String(fd.get("author_name") ?? "").trim();
    const author_role = String(fd.get("author_role") ?? "").trim() || null;
    const author_avatar = String(fd.get("author_avatar") ?? "").trim() || null;
    const quote = String(fd.get("body") ?? "").trim();
    const rating = Math.max(1, Math.min(5, Number(fd.get("rating") ?? 5)));
    const is_featured = String(fd.get("featured") ?? "false") === "true";
    const sort_order = Number(fd.get("sort_order") ?? 0);

    if (!author_name) return { ok: false, error: "Author name is required." };
    if (!quote) return { ok: false, error: "Review text is required." };

    const supabase = await createClient();
    const { error } = await supabase

      .from("testimonials")
      .update({ author_name, author_role, author_avatar, quote, rating, is_featured, sort_order })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    bumpAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteTestimonial(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { error } = await supabase
      
      .from("testimonials")
      .delete()
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    bumpAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleTestimonialActive(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    const is_approved = String(fd.get("active") ?? "true") === "true";
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { error } = await supabase

      .from("testimonials")
      .update({ is_approved })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    bumpAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleTestimonialFeatured(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    const is_featured = String(fd.get("featured") ?? "false") === "true";
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { error } = await supabase

      .from("testimonials")
      .update({ is_featured })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    bumpAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
