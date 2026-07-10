import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { redirect } from 'next/navigation';
import SettingsForm from './settings-form';

/**
 * /admin/content/settings — Global business identity
 * 
 * Single form. All site_settings fields. Sections:
 * - Business identity
 * - Contact
 * - Operational (currency, locale, timezone)
 * - SEO defaults
 * 
 * Voice-sensitive fields (hero copy, brand narrative) live in /admin/content/copy
 * because they need AI assistance, not direct text editing.
 */

export default async function SettingsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');

  const supabase = await createClient();
  
  const { data: settings, error } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from('site_settings')
    .select('*')
    .eq(FK_COL, ctx.siteId)
    .single();
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-display mb-3">Site Settings</h1>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
          Could not load settings. Try refreshing the page.
        </div>
      </div>
    );
  }
  
  return <SettingsForm initialSettings={settings} tenantId={ctx.siteId} />;
}
