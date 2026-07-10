'use server';
import { FK_COL } from '@/lib/db-scope';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { revalidatePath } from 'next/cache';

type Hour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  notes: string | null;
};

export async function updateLocationHours(
  tenantId: string,
  locationId: string,
  hours: Hour[]
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getCurrentSite();
  if (!ctx || ctx.siteId !== tenantId) {
    return { success: false, error: 'Not authorized.' };
  }
  
  const supabase = await createClient();
  
  // Verify location belongs to tenant
  const { data: location } = await supabase
    .from('site_locations')
    .select('id')
    .eq('id', locationId)
    .eq(FK_COL, tenantId)
    .single();
  
  if (!location) return { success: false, error: 'Location not found.' };
  
  // Upsert all 7 days
  for (const h of hours) {
    const { error } = await supabase
      .from('site_hours')
      .upsert({
        location_id: locationId,
        day_of_week: h.day_of_week,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
        is_closed: h.is_closed,
        notes: h.notes,
      }, { onConflict: 'location_id,day_of_week' });
    
    if (error) {
      console.error(`Failed to save hours for day ${h.day_of_week}:`, error);
      return { success: false, error: 'Could not save all hours.' };
    }
  }
  
  revalidatePath('/', 'layout');
  
  return { success: true };
}
