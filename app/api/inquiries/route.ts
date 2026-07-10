import { KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { inquiryNotificationEmail, inquiryAutoReplyEmail } from "@/lib/email/templates";
import { googleSheetsAppendRow } from "@/lib/google";

/**
 * Public endpoint — no auth. Visitor submits the contact form on /site/[slug].
 * We resolve site_id from slug, then insert the inquiry server-side so the
 * site_id is verified and we never trust client input on it.
 */
export async function POST(request: NextRequest) {
  let body: { slug?: string; name?: string; email?: string; phone?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const name = String(body.name ?? "").trim().slice(0, 200);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 50);
  const message = String(body.message ?? "").trim().slice(0, 4000);

  if (!slug || !name || !message) {
    return NextResponse.json({ ok: false, error: "Name and message are required." }, { status: 400 });
  }

  // Public visitor — no session, no service key. Resolve the site through the
  // anon-granted `get_public_site` SECURITY DEFINER RPC (migration 010), which
  // returns only non-sensitive brand fields and only for active sites.
  const supabase = await createClient();
  const { data: siteData } = await withSchema(supabase, KODAGEN_SCHEMA)
    .rpc("get_public_site", { p_slug: slug });
  const site = Array.isArray(siteData) ? siteData[0] : siteData;

  if (!site) return NextResponse.json({ ok: false, error: "Site not found." }, { status: 404 });

  // The insert is permitted by the `public insert inquiries` anon RLS policy;
  // site_id is set server-side from the resolved slug, never trusted from input.
  const { error } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("inquiries")
    .insert({
      site_id: site.site_id,
      name, email, phone, message,
      source: "website_form",
      status: "new",
    });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // ── Send email notifications (fire-and-forget — don't block the response) ──
  const siteId = site.site_id as string;

  // Google Sheets log (no-op unless the integration is connected)
  void googleSheetsAppendRow(siteId, [
    new Date().toISOString(), "inquiry", name, email, phone, message,
  ]).catch(() => {});
  const siteCfg = (site.config ?? {}) as Record<string, unknown>;
  const thm = (site.theme ?? {}) as Record<string, unknown>;
  const siteName = (siteCfg.businessName as string) || (site.name as string) || "Your site";
  const brandColor = (thm.primaryColor as string) || (site.primary_color as string) || undefined;
  const adminEmail = ((siteCfg.contact as Record<string, unknown> | undefined)?.email as string)
    || (site.primary_email as string) || "";

  // 1. Notify admin
  if (adminEmail) {
    const tmpl = inquiryNotificationEmail({
      siteName,
      brandColor,
      visitorName: name,
      visitorEmail: email,
      visitorPhone: phone,
      message,
    });
    sendEmail(siteId, {
      to: adminEmail,
      ...tmpl,
      replyTo: email || undefined,
    }).catch((e) => console.error("[email] inquiry:", e));
  }

  // 2. Auto-reply to visitor
  if (email) {
    const tmpl = inquiryAutoReplyEmail({ siteName, brandColor, visitorName: name });
    sendEmail(siteId, { to: email, ...tmpl }).catch((e) => console.error("[email] inquiry:", e));
  }

  return NextResponse.json({ ok: true });
}
