"use server";
import { FK_COL } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function authorize() {
  const ctx = await getCurrentSite();
  if (!ctx) throw new Error("Not signed in.");
  return ctx;
}

function bumpAll() {
  revalidatePath("/admin/journal");
  revalidatePath("/journal");
  revalidatePath("/sitemap.xml");
}

export async function createJournalPost(
  _: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const title        = String(fd.get("title")        ?? "").trim();
    const slug         = String(fd.get("slug")         ?? "").trim();
    const excerpt      = String(fd.get("excerpt")      ?? "").trim() || null;
    const content      = String(fd.get("content")      ?? "").trim() || null;
    const image_url    = String(fd.get("image_url")    ?? "").trim() || null;
    const author_name  = String(fd.get("author_name")  ?? "").trim() || null;
    const published_at = String(fd.get("published_at") ?? "").trim() || null;
    const is_published = String(fd.get("is_published") ?? "true") === "true";

    if (!title) return { ok: false, error: "Title is required." };
    if (!slug)  return { ok: false, error: "Slug is required." };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("journal_posts")
      .insert({
        site_id: ctx.siteId,
        title,
        slug,
        excerpt,
        content,
        image_url,
        author_name,
        published_at: published_at || new Date().toISOString(),
        is_published,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    bumpAll();
    return { ok: true, id: data?.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateJournalPost(
  _: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id           = String(fd.get("id")           ?? "").trim();
    const title        = String(fd.get("title")        ?? "").trim();
    const slug         = String(fd.get("slug")         ?? "").trim();
    const excerpt      = String(fd.get("excerpt")      ?? "").trim() || null;
    const content      = String(fd.get("content")      ?? "").trim() || null;
    const image_url    = String(fd.get("image_url")    ?? "").trim() || null;
    const author_name  = String(fd.get("author_name")  ?? "").trim() || null;
    const published_at = String(fd.get("published_at") ?? "").trim() || null;
    const is_published = String(fd.get("is_published") ?? "true") === "true";

    if (!id)    return { ok: false, error: "Post ID missing." };
    if (!title) return { ok: false, error: "Title is required." };
    if (!slug)  return { ok: false, error: "Slug is required." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("journal_posts")
      .update({ title, slug, excerpt, content, image_url, author_name, published_at, is_published })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);

    if (error) return { ok: false, error: error.message };
    bumpAll();
    revalidatePath(`/journal/${slug}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteJournalPost(id: string): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const supabase = await createClient();
    const { error } = await supabase
      .from("journal_posts")
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

export async function toggleJournalPublished(id: string, is_published: boolean): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const supabase = await createClient();
    const { error } = await supabase
      .from("journal_posts")
      .update({ is_published })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);

    if (error) return { ok: false, error: error.message };
    bumpAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
