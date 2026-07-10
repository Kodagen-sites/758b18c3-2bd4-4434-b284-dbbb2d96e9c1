import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import ContentHubView, { type ContentArea } from './content-hub-view';

/**
 * /admin/content — Content Hub
 *
 * Entry point for content management. Cards link to each editable area with
 * a last-updated stamp, computed server-side (no client API round-trip).
 * Everything here writes to the site_* tables that lib/site-content.ts reads,
 * so edits show up on the public site.
 */

export const revalidate = 0;

async function latest(q: PromiseLike<{ data: Array<{ updated_at?: string | null }> | null }>): Promise<string | undefined> {
  try {
    const { data } = await q;
    return data?.[0]?.updated_at ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function ContentHubPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');

  const supabase = await createClient();
  const pick = (table: string) =>
    latest(supabase.from(table).select('updated_at').eq(FK_COL, ctx.siteId).order('updated_at', { ascending: false }).limit(1));

  const [settingsAt, pagesAt, locationsAt, socialAt, copyAt] = await Promise.all([
    latest(withSchema(supabase, KODAGEN_SCHEMA).from('site_settings').select('updated_at').eq(FK_COL, ctx.siteId).limit(1)),
    pick('site_pages'),
    pick('site_locations'),
    pick('site_social_links'),
    pick('site_copy_overrides'),
  ]);

  const areas: ContentArea[] = [
    {
      href: '/admin/content/settings',
      title: 'Site Settings',
      description: 'Business name, contact details, currency, locale, default SEO.',
      icon: 'settings',
      lastUpdated: settingsAt,
    },
    {
      href: '/admin/content/pages',
      title: 'Pages',
      description: 'Per-page SEO titles and descriptions, publish status, nav visibility.',
      icon: 'pages',
      lastUpdated: pagesAt,
    },
    {
      href: '/admin/content/locations',
      title: 'Locations',
      description: 'Addresses, coordinates, per-location contact details.',
      icon: 'locations',
      lastUpdated: locationsAt,
    },
    {
      href: '/admin/content/hours',
      title: 'Hours of Operation',
      description: 'Opening hours per location per day. Holiday closures.',
      icon: 'hours',
      lastUpdated: undefined,
    },
    {
      href: '/admin/content/social',
      title: 'Social Links',
      description: 'Instagram, Facebook, WhatsApp, and other social URLs shown on your site.',
      icon: 'social',
      lastUpdated: socialAt,
    },
    {
      href: '/admin/media',
      title: 'Media Library',
      description: 'Upload and organize photos and videos for your site.',
      icon: 'media',
    },
    {
      href: '/admin/content/copy',
      title: 'Voice & Copy',
      description: 'Edit hero text, brand story, and other voice-sensitive copy with AI help.',
      icon: 'copy',
      lastUpdated: copyAt,
    },
    {
      href: '/admin/journal',
      title: 'Journal',
      description: 'Write and publish blog posts — they appear on the public journal page and in the sitemap.',
      icon: 'journal',
    },
    {
      href: '/admin/testimonials',
      title: 'Testimonials',
      description: 'Manage customer reviews shown on your site.',
      icon: 'testimonials',
    },
  ];

  return <ContentHubView areas={areas} />;
}
