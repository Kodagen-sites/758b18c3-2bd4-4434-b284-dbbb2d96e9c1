import { FK_COL } from '@/lib/db-scope';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import HoursEditor from './hours-editor';

/**
 * /admin/content/hours — hours of operation per location per day
 * 
 * For each location: 7 rows (Sun-Sat) with open/close times or "closed" toggle.
 * Bulk actions: "Same hours all weekdays", "Closed all weekend".
 */

export default async function HoursPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');
  
  const supabase = await createClient();
  
  const { data: locations } = await supabase
    .from('site_locations')
    .select('id, slug, display_name, hours:site_hours(*)')
    .eq(FK_COL, ctx.siteId)
    .eq('is_active', true)
    .order('display_order');
  
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/admin/content" className="text-sm text-neutral-500 hover:text-neutral-800 mb-3 inline-block">
          ← Content
        </Link>
        <h1 className="text-4xl font-display mb-2">Hours of Operation</h1>
        <p className="text-neutral-600 max-w-2xl">
          When you're open. Shown on your contact page, footer, and any location detail pages.
        </p>
      </div>
      
      {locations && locations.length > 0 ? (
        <div className="space-y-8">
          {locations.map(loc => (
            <HoursEditor
              key={loc.id}
              locationId={loc.id}
              displayName={loc.display_name}
              tenantId={ctx.siteId}
              initialHours={loc.hours ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl text-center">
          <p className="text-neutral-600 mb-4">Add a location first to set hours.</p>
          <Link href="/admin/content/locations/new" className="text-brand-accent font-medium">
            Add location →
          </Link>
        </div>
      )}
    </div>
  );
}
