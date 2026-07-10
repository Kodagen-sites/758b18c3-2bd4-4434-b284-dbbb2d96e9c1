'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from 'next/cache';

/**
 * Server action to update site_settings.
 * Called from /admin/content/settings form.
 */

type SettingsUpdate = {
  business_name: string;
  legal_name: string | null;
  tagline_short: string | null;
  founded_year: number | null;
  primary_phone: string | null;
  whatsapp_phone: string | null;
  primary_email: string | null;
  support_email: string | null;
  default_currency: string;
  default_locale: string;
  default_timezone: string;
  default_meta_title: string | null;
  default_meta_description: string | null;
  default_og_image_url: string | null;
};

export async function updateSiteSettings(
  scopeId: string,
  update: SettingsUpdate
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getCurrentSite();
  if (!ctx || ctx.siteId !== scopeId) {
    return { success: false, error: 'Not authorized.' };
  }

  const supabase = await createClient();

  if (!update.business_name?.trim()) {
    return { success: false, error: 'Business name is required.' };
  }

  if (update.primary_email && !isValidEmail(update.primary_email)) {
    return { success: false, error: 'Primary email format is invalid.' };
  }

  if (update.support_email && !isValidEmail(update.support_email)) {
    return { success: false, error: 'Support email format is invalid.' };
  }

  if (update.founded_year && (update.founded_year < 1800 || update.founded_year > new Date().getFullYear())) {
    return { success: false, error: 'Founded year is out of range.' };
  }

  const { error } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from('site_settings')
    .update({
      ...update,
      // No updated_by stamp — kodagen.site_settings has no such column
      // (PGRST204 fails the whole update); audit_log records the actor.
      updated_at: new Date().toISOString(),
    })
    .eq(FK_COL, scopeId);

  if (error) {
    console.error('Failed to update site_settings:', error);
    return { success: false, error: 'Could not save. Try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
