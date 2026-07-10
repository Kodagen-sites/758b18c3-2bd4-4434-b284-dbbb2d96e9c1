import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * /admin/content/copy — Voice & Copy Editor List
 * 
 * Lists all voice-sensitive copy fields with their current values.
 * Each field has "Edit with AI" button → opens AI chat panel.
 * 
 * The AI chat enforces voice-banks rules so owner can't accidentally
 * write claim-word copy that breaks voice discipline.
 */

const COPY_FIELDS = [
  {
    key: 'hero.headline',
    label: 'Hero headline',
    description: 'The main headline on your homepage. Should embody your voice.',
    location: 'Homepage hero',
  },
  {
    key: 'hero.subhead',
    label: 'Hero subhead',
    description: 'The supporting line under your hero headline.',
    location: 'Homepage hero',
  },
  {
    key: 'about.narrative',
    label: 'About narrative',
    description: 'Your brand story. 3-5 sentences in your voice.',
    location: 'About page',
  },
  {
    key: 'footer.statement',
    label: 'Footer brand statement',
    description: 'The closing line at the bottom of every page.',
    location: 'Footer',
  },
  {
    key: 'cta.primary',
    label: 'Primary CTA copy',
    description: 'The call-to-action that closes your homepage.',
    location: 'Homepage CTA section',
  },
];

export default async function CopyEditorListPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');
  
  const supabase = await createClient();
  
  const [{ data: settings }, { data: overrides }] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA).from('site_settings').select('voice_family,hero_headline,hero_subhead,brand_narrative,footer_statement').eq(FK_COL, ctx.siteId).single(),
    withSchema(supabase, KODAGEN_SCHEMA).from('site_copy_overrides').select('copy_key,copy_value,updated_at').eq(FK_COL, ctx.siteId),
  ]);
  
  const overridesMap = new Map<string, { value: any; updated: any }>(
    (overrides ?? []).map((o: any) => [o.copy_key, { value: o.copy_value, updated: o.updated_at }])
  );
  
  // Resolve current values: overrides → settings cache → null
  const resolved = COPY_FIELDS.map(field => {
    const override = overridesMap.get(field.key);
    let currentValue: string | null = null;
    let updatedAt: string | null = null;
    
    if (override) {
      currentValue = override.value;
      updatedAt = override.updated;
    } else {
      // Fall back to cached value in site_settings
      if (field.key === 'hero.headline') currentValue = settings?.hero_headline ?? null;
      else if (field.key === 'hero.subhead') currentValue = settings?.hero_subhead ?? null;
      else if (field.key === 'about.narrative') currentValue = settings?.brand_narrative ?? null;
      else if (field.key === 'footer.statement') currentValue = settings?.footer_statement ?? null;
    }
    
    return {
      ...field,
      currentValue,
      updatedAt,
      isOverridden: !!override,
    };
  });
  
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/admin/content" className="text-sm text-neutral-500 hover:text-neutral-800 mb-3 inline-block">
          ← Content
        </Link>
        <h1 className="text-4xl font-display mb-2">Voice & Copy</h1>
        <p className="text-neutral-600 max-w-2xl">
          These are the voice-sensitive parts of your site. Edit them with AI to keep
          your tone consistent. The AI knows your voice rules and will refuse copy that
          breaks them.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-full text-sm">
          <span className="w-2 h-2 bg-brand-accent rounded-full"></span>
          <span>Voice: <strong>{settings?.voice_family ?? 'V1 Heritage Understated'}</strong></span>
        </div>
      </div>
      
      <div className="space-y-3">
        {resolved.map(field => (
          <Link
            key={field.key}
            href={`/admin/content/copy/${encodeURIComponent(field.key)}`}
            className="block p-6 bg-white border border-neutral-200 rounded-xl hover:border-neutral-400 hover:shadow-sm transition group"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-display text-lg">{field.label}</h3>
                  {field.isOverridden && (
                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                      Edited
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 mb-3">{field.description}</p>
                
                {field.currentValue ? (
                  <div className="text-base text-neutral-800 italic font-display border-l-2 border-neutral-300 pl-4 py-1">
                    "{field.currentValue}"
                  </div>
                ) : (
                  <div className="text-sm text-neutral-400 italic">Not set yet</div>
                )}
                
                <div className="mt-3 text-xs text-neutral-400">
                  Shows on: {field.location}
                  {field.updatedAt && ` · Updated ${formatRelativeTime(field.updatedAt)}`}
                </div>
              </div>
              
              <div className="text-sm font-medium text-brand-accent shrink-0 group-hover:translate-x-1 transition-transform">
                Edit with AI →
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-12 p-6 bg-neutral-50 rounded-xl border border-neutral-200">
        <h3 className="font-display text-lg mb-2">Why we use AI for these</h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Voice-sensitive copy is hard to write well. It's easy to accidentally use words
          that feel generic ("luxury," "world-class," "experience the difference") or too
          corporate. The AI knows the voice rules for your brand and will only suggest copy
          that follows them. You can always edit manually if you prefer.
        </p>
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  
  if (diffHr < 1) return 'just now';
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
