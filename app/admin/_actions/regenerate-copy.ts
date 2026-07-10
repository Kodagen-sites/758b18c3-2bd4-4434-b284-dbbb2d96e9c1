'use server';
import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSite } from '@/lib/site-scope';
import { revalidatePath } from 'next/cache';

/**
 * Server actions for AI copy regeneration.
 * 
 * regenerateCopy: takes user request, returns 2-3 voice-compliant alternatives
 * acceptCopyAlternative: saves chosen alternative to site_copy_overrides
 * 
 * Voice discipline: the system prompt loads voice-banks rules so the AI
 * cannot suggest claim-word copy. Every regeneration is logged for audit.
 */

// ============================================================================
// Voice rules (inlined here for runtime; mirrored from references/voice-banks.md)
// In production, generate this from voice-banks.md at build time.
// ============================================================================
const VOICE_RULES: Record<string, string> = {
  V1: `
V1 — Heritage Understated

Tone: confident, quiet, sparing. Premium without being loud. Specific over vague.

RULES:
- Short sentences. Often one word.
- Periods do work that em-dashes try to do. Use periods.
- Plain English. No corporate language.
- Specific anchors over abstract claims. "Always for the late train" not "convenient location."
- Implied luxury through restraint, not declaration.

BANNED WORDS (will be rejected):
- luxury, luxurious, premium, exclusive, world-class, best-in-class, premier
- experience, journey, escape, indulge, discover, unwind, transform
- elevate, leverage, supercharge, unlock, seamless, frictionless, effortless
- bespoke (overused), curated (overused), handcrafted (when not literally hand-crafted)
- "experience the difference," "where X meets Y," "redefining"

PATTERNS TO USE:
- Place + specific moment: "Lagos. Always for the late train."
- One concrete detail standing in for the whole: "Three bartenders, one key."
- Refusal-as-confidence: "We don't take walk-ins after midnight. Apologies in advance."
- Period rhythm: "Twelve rooms. Two cities. Open since 2024."

LENGTH:
- Hero headline: 2-7 words ideal. Max 10.
- Hero subhead: 5-12 words.
- About narrative: 3-5 short sentences.
- Footer statement: 2-6 words.
`,
  V2: `
V2 — Intellectual Editorial

Tone: considered, slightly literary, thinks before speaking.

RULES:
- Longer sentences allowed when they earn complexity.
- Em-dashes used carefully (max 1 per paragraph).
- Cultural references welcome when accurate.
- Voice of a magazine editor, not a marketer.

BANNED WORDS:
- Same as V1 plus: "thought leadership," "innovate," "ecosystem," "synergy"

LENGTH:
- Hero headline: 4-12 words.
- About narrative: 4-7 sentences.
`,
  V3: `V3 — Organic Grounded. Warm, plain-spoken, rooted. Avoids both corporate and aspirational vocabulary. Same banned words as V1.`,
  V4: `V4 — Humane Professional. Restrained, friendly, professional. Like a doctor or accountant who actually likes their patients/clients. Same banned words as V1.`,
  V5: `V5 — Appetite Kinetic. For restaurants and food. Sensory. Specific. Hungry. Avoids "delicious," "amazing," "must-try." Uses "the rice," "the suya," "the heat from the chili."`,
  V6: `V6 — Systems Precise. For tech and B2B. Direct, technical when needed, no marketing fluff. Avoids most adjectives. Says what the system does, not what users will feel.`,
  V7: `V7 — Narrative Imaginative. For creative work. Allows poetic phrasing. Still avoids claim words. Cinematic, not cheesy.`,
};

// ============================================================================
// regenerateCopy — generate alternatives via Claude
// ============================================================================

export async function regenerateCopy({
  tenantId,
  copyKey,
  userRequest,
}: {
  tenantId: string;
  copyKey: string;
  userRequest: string;
}): Promise<
  | { success: true; sessionId: string; alternatives: Array<{ alternative: string; reasoning: string }> }
  | { success: false; error: string }
> {
  // Auth check
  const ctx = await getCurrentSite();
  if (!ctx || ctx.siteId !== tenantId) {
    return { success: false, error: 'Not authorized.' };
  }
  
  const supabase = await createClient();
  
  // Load context
  const { data: settings } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from('site_settings')
    .select('voice_family,business_name,industry_classification,hero_headline,hero_subhead,brand_narrative,footer_statement')
    .eq(FK_COL, tenantId)
    .single();
  
  if (!settings) {
    return { success: false, error: 'Could not load site settings.' };
  }
  
  const voiceFamily = settings.voice_family ?? 'V1';
  const voiceRules = VOICE_RULES[voiceFamily] ?? VOICE_RULES.V1;
  
  // Resolve current value of this field
  let currentValue: string | null = null;
  const { data: override } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from('site_copy_overrides')
    .select('copy_value')
    .eq(FK_COL, tenantId)
    .eq('copy_key', copyKey)
    .maybeSingle();
  
  if (override?.copy_value) {
    currentValue = override.copy_value;
  } else if (copyKey === 'hero.headline') currentValue = settings.hero_headline;
  else if (copyKey === 'hero.subhead') currentValue = settings.hero_subhead;
  else if (copyKey === 'about.narrative') currentValue = settings.brand_narrative;
  else if (copyKey === 'footer.statement') currentValue = settings.footer_statement;
  
  // Build system prompt
  const systemPrompt = `You are helping edit voice-sensitive copy for a premium business website.

Brand: ${settings.business_name}
Industry: ${settings.industry_classification}
Voice family: ${voiceFamily}

VOICE RULES (must follow ALL of these):
${voiceRules}

The owner is editing this field: ${copyKey}
${currentValue ? `Current value: "${currentValue}"` : 'This field has no current value yet.'}

Generate 3 alternatives that:
1. Address what the owner asked for
2. Strictly follow the voice rules above
3. Avoid all banned words
4. Match the brand's tone

If the owner's request would force you to break the voice rules (e.g. they ask for "luxurious" or "world-class" copy), explain why in the reasoning and offer alternatives that achieve their underlying goal without breaking the rules.

Return ONLY a JSON array, no preamble, no markdown fences:
[
  { "alternative": "...", "reasoning": "Brief explanation of choice" },
  { "alternative": "...", "reasoning": "..." },
  { "alternative": "...", "reasoning": "..." }
]`;
  
  // Call the AI. Preferred path: the Kodagen platform proxy (site-scoped
  // token — no master API key ever lives in this deployment). Fallback:
  // a customer-provided ANTHROPIC_API_KEY, for self-hosted setups.
  const proxyUrl = process.env.KODAGEN_PROXY_URL;
  const siteToken = process.env.KODAGEN_SITE_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!proxyUrl || !siteToken) {
    if (!apiKey) {
      return { success: false, error: 'AI editor not configured.' };
    }
  }

  let alternatives: Array<{ alternative: string; reasoning: string }> = [];

  try {
    let text = '';
    if (proxyUrl && siteToken) {
      const r = await fetch(`${proxyUrl.replace(/\/$/, '')}/ai-copy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${siteToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, user: userRequest, maxTokens: 1024 }),
      });
      const json = (await r.json()) as { ok?: boolean; text?: string; error?: string };
      if (!r.ok || !json.ok) {
        return { success: false, error: json.error ?? 'AI service error. Try again in a moment.' };
      }
      text = json.text ?? '';
    } else {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userRequest }],
      });
      const textBlock = response.content.find(b => b.type === 'text');
      text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    }

    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    alternatives = JSON.parse(cleaned);

    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      return { success: false, error: 'AI returned an unexpected response. Try rephrasing.' };
    }
  } catch (err) {
    console.error('Claude API error:', err);
    return { success: false, error: 'AI service error. Try again in a moment.' };
  }
  
  // Log session
  const { data: session, error: sessionError } = await supabase
    .from('site_ai_chat_sessions')
    .insert({
      tenant_id: tenantId,
      copy_key: copyKey,
      user_request: userRequest,
      ai_response: JSON.stringify(alternatives),
      voice_family: voiceFamily,
      initiated_by: ctx.userId,
    })
    .select('id')
    .single();
  
  if (sessionError || !session) {
    console.error('Failed to log chat session:', sessionError);
    // Continue anyway — alternatives still useful even if logging fails
    return { success: true, sessionId: 'unlogged', alternatives };
  }
  
  return { success: true, sessionId: session.id, alternatives };
}

// ============================================================================
// acceptCopyAlternative — save chosen alternative to overrides
// ============================================================================

export async function acceptCopyAlternative({
  tenantId,
  sessionId,
  alternative,
  manual,
  copyKey: copyKeyOverride,
}: {
  tenantId: string;
  sessionId: string | null;
  alternative: string;
  manual?: boolean;
  copyKey?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getCurrentSite();
  if (!ctx || ctx.siteId !== tenantId) {
    return { success: false, error: 'Not authorized.' };
  }
  
  const supabase = await createClient();
  
  // Determine copy key
  let copyKey = copyKeyOverride;
  
  if (!manual && sessionId && sessionId !== 'unlogged') {
    const { data: session } = await supabase
      .from('site_ai_chat_sessions')
      .select('copy_key')
      .eq('id', sessionId)
      .single();
    
    if (session) copyKey = session.copy_key;
  }
  
  if (!copyKey) {
    return { success: false, error: 'Copy key missing.' };
  }
  
  // Save to overrides
  // Shared (kodagen schema) has the slim shape (site_id, copy_key, copy_value);
  // dedicated keeps the richer audit columns. FK_COL picks the scope column.
  const { error: upsertError } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from('site_copy_overrides')
    .upsert(
      KODAGEN_SCHEMA
        ? { site_id: tenantId, copy_key: copyKey, copy_value: alternative }
        : {
            tenant_id: tenantId,
            copy_key: copyKey,
            copy_value: alternative,
            generated_by: manual ? 'manual' : 'ai',
            ai_chat_session_id: !manual && sessionId !== 'unlogged' ? sessionId : null,
            updated_by: ctx.userId,
          },
      { onConflict: `${FK_COL},copy_key` },
    );
  
  if (upsertError) {
    console.error('Failed to save copy override:', upsertError);
    return { success: false, error: 'Could not save. Try again.' };
  }
  
  // Mark session as accepted
  if (!manual && sessionId && sessionId !== 'unlogged') {
    await supabase
      .from('site_ai_chat_sessions')
      .update({ was_accepted: true, accepted_alternative: alternative })
      .eq('id', sessionId);
  }
  
  // Invalidate caches that depend on this copy field
  revalidatePath('/', 'layout');
  
  return { success: true };
}
