import { FK_COL } from '@/lib/db-scope';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import PagesView, { type SitePage } from './pages-view';

/**
 * /admin/content/pages — per-page SEO + visibility.
 * Rows come from site_pages (seeded at build); lib/site-content.ts serves
 * meta/hero overrides to the public pages, so edits here change the site.
 */

export const revalidate = 0;

export default async function PagesPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');

  const supabase = await createClient();
  const { data } = await supabase
    .from('site_pages')
    .select('id, slug, page_type, meta_title, meta_description, hero_headline_override, hero_subhead_override, is_published, is_indexed, is_in_nav, updated_at')
    .eq(FK_COL, ctx.siteId)
    .order('display_order');

  const pages: SitePage[] = (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    pageType: r.page_type as string,
    metaTitle: (r.meta_title as string | null) ?? "",
    metaDescription: (r.meta_description as string | null) ?? "",
    heroHeadline: (r.hero_headline_override as string | null) ?? "",
    heroSubhead: (r.hero_subhead_override as string | null) ?? "",
    isPublished: Boolean(r.is_published),
    isIndexed: Boolean(r.is_indexed),
    isInNav: Boolean(r.is_in_nav),
  }));

  return <PagesView pages={pages} />;
}
