import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import MediaView, { type MediaItem } from "./media-view";


export default async function MediaPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = createServiceClient();
  const [{ data, error }, config, counts] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("media")
      .select("id, storage_path, filename, alt, created_at")
      .eq(FK_COL, ctx.siteId)
      .order("created_at", { ascending: false })
      .limit(500),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);
  if (error) console.error("media:", error.message);

  type Row = { id: string; storage_path: string; filename: string; alt: string | null; created_at: string };
  const items: MediaItem[] = ((data ?? []) as Row[]).map((r) => {
    // Seeded gallery rows store the external URL directly in storage_path.
    // For real uploads, storage_path is a Supabase Storage object key.
    const isExternal = r.storage_path.startsWith("http");
    const url = isExternal
      ? r.storage_path
      : supabase.storage.from("site-assets").getPublicUrl(r.storage_path).data.publicUrl;
    return {
      id: r.id,
      url,
      filename: r.filename,
      alt: r.alt,
      created_at: r.created_at,
    };
  });

  return (
    <MediaView
      items={items}
      publicUrlBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets`}
      config={config}
      counts={counts}
    />
  );
}
