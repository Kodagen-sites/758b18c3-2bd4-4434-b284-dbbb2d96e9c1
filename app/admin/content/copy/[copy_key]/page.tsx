import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { redirect, notFound } from 'next/navigation';
import CopyEditorChat from './copy-editor-chat';

/**
 * /admin/content/copy/[copy_key] — single-field AI chat editor
 * 
 * Owner asks AI to revise a voice-sensitive copy field.
 * AI returns 2-3 alternatives, all V1-voice-compliant.
 * Owner accepts one, saves to site_copy_overrides.
 */

const FIELD_METADATA: Record<string, { label: string; description: string; example: string }> = {
  'hero.headline': {
    label: 'Hero headline',
    description: 'The main statement on your homepage. Should embody your voice in 1-2 lines.',
    example: 'Always for the late train.',
  },
  'hero.subhead': {
    label: 'Hero subhead',
    description: 'The supporting line under your hero. Often connects emotion to specifics.',
    example: 'Quietly considered. Lagos and Abuja.',
  },
  'about.narrative': {
    label: 'About narrative',
    description: 'Your brand story in 3-5 sentences.',
    example: '',
  },
  'footer.statement': {
    label: 'Footer brand statement',
    description: 'A closing thought at the bottom of every page.',
    example: 'Open since 2024.',
  },
  'cta.primary': {
    label: 'Primary CTA copy',
    description: 'The call-to-action that closes your homepage.',
    example: 'Stay with us.',
  },
};

type Props = {
  params: Promise<{ copy_key: string }>;
};

export default async function CopyEditorPage({ params }: Props) {
  const { copy_key: copyKeyEncoded } = await params;
  const copyKey = decodeURIComponent(copyKeyEncoded);
  
  const metadata = FIELD_METADATA[copyKey];
  if (!metadata) notFound();
  
  const ctx = await getCurrentSite();
  if (!ctx) redirect('/admin/login');
  
  const supabase = await createClient();
  
  const [{ data: settings }, { data: override }, { data: chatHistory }] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA).from('site_settings').select('voice_family,business_name,industry_classification,hero_headline,hero_subhead,brand_narrative,footer_statement').eq(FK_COL, ctx.siteId).single(),
    supabase.from('site_copy_overrides').select('copy_value,updated_at').eq(FK_COL, ctx.siteId).eq('copy_key', copyKey).maybeSingle(),
    supabase.from('site_ai_chat_sessions').select('*').eq(FK_COL, ctx.siteId).eq('copy_key', copyKey).order('created_at', { ascending: false }).limit(20),
  ]);
  
  // Resolve current value
  let currentValue: string | null = null;
  if (override?.copy_value) {
    currentValue = override.copy_value;
  } else if (copyKey === 'hero.headline') {
    currentValue = settings?.hero_headline ?? null;
  } else if (copyKey === 'hero.subhead') {
    currentValue = settings?.hero_subhead ?? null;
  } else if (copyKey === 'about.narrative') {
    currentValue = settings?.brand_narrative ?? null;
  } else if (copyKey === 'footer.statement') {
    currentValue = settings?.footer_statement ?? null;
  }
  
  return (
    <CopyEditorChat
      tenantId={ctx.siteId}
      copyKey={copyKey}
      label={metadata.label}
      description={metadata.description}
      example={metadata.example}
      currentValue={currentValue}
      voiceFamily={settings?.voice_family ?? 'V1'}
      businessName={settings?.business_name ?? ''}
      industry={settings?.industry_classification ?? ''}
      chatHistory={chatHistory ?? []}
    />
  );
}
