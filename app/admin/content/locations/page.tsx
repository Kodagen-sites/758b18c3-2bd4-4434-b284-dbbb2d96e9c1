import { FK_COL } from '@/lib/db-scope';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * /admin/content/locations — list + manage locations
 * 
 * Lists all site_locations rows. Click a location to edit.
 * Add new location → /admin/content/locations/new
 * Edit existing → /admin/content/locations/[location_id]
 */

export default async function LocationsListPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');
  
  const supabase = await createClient();
  
  const { data: locations } = await supabase
    .from('site_locations')
    .select('*')
    .eq(FK_COL, ctx.siteId)
    .order('display_order');
  
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/admin/content" className="text-sm text-neutral-500 hover:text-neutral-800 mb-3 inline-block">
            ← Content
          </Link>
          <h1 className="text-4xl font-display mb-2">Locations</h1>
          <p className="text-neutral-600 max-w-2xl">
            Your physical locations. Each has its own address, contact details, and hours.
          </p>
        </div>
        <Link
          href="/admin/content/locations/new"
          className="px-4 py-2 bg-brand-accent text-white rounded-lg font-medium hover:opacity-90"
        >
          + Add location
        </Link>
      </div>
      
      <div className="space-y-3">
        {locations && locations.length > 0 ? (
          locations.map(loc => (
            <Link
              key={loc.id}
              href={`/admin/content/locations/${loc.id}`}
              className="block p-6 bg-white border border-neutral-200 rounded-xl hover:border-neutral-400 transition"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg mb-1">{loc.display_name}</h3>
                  <div className="text-sm text-neutral-600">
                    {loc.address_line_1}{loc.address_line_2 ? `, ${loc.address_line_2}` : ''}, {loc.city}{loc.state ? `, ${loc.state}` : ''}, {loc.country}
                  </div>
                  {loc.primary_phone && (
                    <div className="text-sm text-neutral-500 mt-1">{loc.primary_phone}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!loc.is_active && (
                    <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full">
                      Inactive
                    </span>
                  )}
                  <span className="text-sm text-brand-accent">Edit →</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl text-center">
            <p className="text-neutral-600 mb-4">No locations yet.</p>
            <Link
              href="/admin/content/locations/new"
              className="inline-block px-4 py-2 bg-brand-accent text-white rounded-lg font-medium"
            >
              Add your first location
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
