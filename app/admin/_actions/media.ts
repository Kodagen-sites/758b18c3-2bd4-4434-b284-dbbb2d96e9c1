"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type UploadResult =
  | { ok: true; url: string; id: string }
  | { ok: false; error: string };

const BUCKET = "site-assets";
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Uploads an image to the site-assets Supabase Storage bucket and records it
 * in kodagen.media. Returns the public URL.
 */
export async function uploadMedia(_: UploadResult | null, fd: FormData): Promise<UploadResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "media.upload", ctx.permissions)) {
    return { ok: false, error: "You don't have permission to upload media." };
  }

  const file = fd.get("file") as File | null;
  const alt  = String(fd.get("alt") ?? "").trim();
  if (!file) return { ok: false, error: "No file selected." };
  if (!ALLOWED_MIME.includes(file.type)) return { ok: false, error: "Only JPG/PNG/WebP/GIF/AVIF allowed." };
  if (file.size > MAX_BYTES) return { ok: false, error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB).` };

  const supabase = createServiceClient();

  // Ensure bucket exists (idempotent — ignores "already exists")
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => null);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${ctx.siteId}/uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const { data: row, error: dbErr } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("media")
    .insert({
      site_id: ctx.siteId,
      storage_path: path,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      alt: alt || null,
      uploaded_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/admin/media");
  return { ok: true, url, id: row!.id as string };
}

export type MediaItem = { id: string; url: string; alt: string; filename: string };

/**
 * Returns all media for the current site, newest first. Used by the image
 * picker shown in rooms / content / testimonials forms.
 */
export async function listSiteMedia(): Promise<MediaItem[]> {
  const ctx = await getCurrentSite();
  if (!ctx) return [];

  const supabase = createServiceClient();
  const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("media")
    .select("id, storage_path, alt, filename")
    .eq(FK_COL, ctx.siteId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((m: any) => {
    const isExternal = (m.storage_path as string).startsWith("http");
    const url = isExternal
      ? (m.storage_path as string)
      : supabase.storage.from(BUCKET).getPublicUrl(m.storage_path as string).data.publicUrl;
    return {
      id: m.id as string,
      url,
      alt: (m.alt as string | null) ?? "",
      filename: (m.filename as string) ?? "",
    };
  });
}

export async function deleteMedia(_: UploadResult | null, fd: FormData): Promise<UploadResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id." };

  const supabase = createServiceClient();
  const { data: media } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("media")
    .select("storage_path, site_id")
    .eq("id", id)
    .single();
  if (!media || media.site_id !== ctx.siteId) {
    return { ok: false, error: "Not found or not yours." };
  }

  await supabase.storage.from(BUCKET).remove([media.storage_path]);
  await withSchema(supabase, KODAGEN_SCHEMA).from("media").delete().eq("id", id);

  revalidatePath("/admin/media");
  return { ok: true, url: "", id };
}
