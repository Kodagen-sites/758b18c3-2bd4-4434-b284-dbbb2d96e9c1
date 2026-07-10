import { FK_COL } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import JournalView, { type AdminPost } from "./journal-view";

export const revalidate = 0;

export default async function JournalAdminPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const [{ data: rows }, config, counts] = await Promise.all([
    supabase
      .from("journal_posts")
      .select("id, slug, title, excerpt, content, image_url, author_name, published_at, is_published, created_at")
      .eq(FK_COL, ctx.siteId)
      .order("published_at", { ascending: false })
      .order("created_at",   { ascending: false }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  if (!config) redirect("/admin/login");

  const posts: AdminPost[] = (rows ?? []).map((r) => ({
    id:           r.id           as string,
    slug:         r.slug         as string,
    title:        r.title        as string,
    excerpt:      (r.excerpt     as string | null) ?? "",
    content:      (r.content     as string | null) ?? "",
    image_url:    (r.image_url   as string | null) ?? "",
    author_name:  (r.author_name as string | null) ?? "",
    published_at: (r.published_at as string | null) ?? (r.created_at as string),
    is_published: Boolean(r.is_published),
    created_at:   r.created_at  as string,
  }));

  return <JournalView posts={posts} config={config} counts={counts} />;
}
