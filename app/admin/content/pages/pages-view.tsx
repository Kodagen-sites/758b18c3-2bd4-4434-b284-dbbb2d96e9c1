"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { ChevronDown, ChevronRight, AlertCircle, Save, ArrowLeft, FileText, Check } from "lucide-react";
import { updateSitePage, type ActionResult } from "@/app/admin/_actions/pages";

export type SitePage = {
  id: string;
  slug: string;
  pageType: string;
  metaTitle: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubhead: string;
  isPublished: boolean;
  isIndexed: boolean;
  isInNav: boolean;
};

function Toggle({ name, label, hint, defaultChecked, s }: {
  name: string; label: string; hint: string; defaultChecked: boolean; s: ReturnType<typeof getAdminStyles>;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 accent-blue-600" />
      <span>
        <span className={`block text-sm ${s.textPrimary}`}>{label}</span>
        <span className={`block text-[11px] ${s.textMuted}`}>{hint}</span>
      </span>
    </label>
  );
}

function PageEditor({ page, s }: { page: SitePage; s: ReturnType<typeof getAdminStyles> }) {
  const [state, formAction, pending] = useActionState(updateSitePage, null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  const input = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;
  const label = `block text-xs font-medium mb-1.5 ${s.textSecondary}`;

  return (
    <form action={formAction} className="space-y-4 px-4 pb-4">
      <input type="hidden" name="id" value={page.id} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={label}>SEO title</label>
          <input name="metaTitle" defaultValue={page.metaTitle} className={input} placeholder="Shown in the browser tab and Google" />
        </div>
        <div>
          <label className={label}>SEO description</label>
          <input name="metaDescription" defaultValue={page.metaDescription} className={input} placeholder="140–160 characters" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={label}>Hero headline override</label>
          <input name="heroHeadline" defaultValue={page.heroHeadline} className={input} placeholder="Leave blank to keep the built-in headline" />
        </div>
        <div>
          <label className={label}>Hero subhead override</label>
          <input name="heroSubhead" defaultValue={page.heroSubhead} className={input} placeholder="Leave blank to keep the built-in subhead" />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <Toggle name="isPublished" label="Published" hint="Unpublished pages return 404" defaultChecked={page.isPublished} s={s} />
        <Toggle name="isIndexed" label="Search engines" hint="Allow Google to index this page" defaultChecked={page.isIndexed} s={s} />
        <Toggle name="isInNav" label="In navigation" hint="Show in the site's main menu" defaultChecked={page.isInNav} s={s} />
      </div>
      {state && !state.ok && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
        </div>
      )}
      <button type="submit" disabled={pending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition">
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {pending ? "Saving…" : saved ? "Saved" : "Save page"}
      </button>
    </form>
  );
}

export default function PagesView({ pages }: { pages: SitePage[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/admin/content" className={`inline-flex items-center gap-1 text-xs mb-4 ${s.textSecondary} hover:underline`}>
        <ArrowLeft className="w-3 h-3" /> Content
      </Link>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Pages</h1>
        <p className={`text-sm mt-1 ${s.textSecondary}`}>
          Per-page SEO, hero overrides, and visibility. Changes update the live site.
        </p>
      </div>

      {pages.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${s.cardBg} ${s.cardBorder}`}>
          <FileText className={`w-8 h-8 mx-auto mb-3 ${s.textMuted}`} />
          <p className={`font-medium ${s.textPrimary}`}>No pages registered</p>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>
            Pages are seeded when your site is built. If this looks wrong, contact support.
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border divide-y ${s.cardBg} ${s.cardBorder} ${dark ? "divide-white/[0.06]" : "divide-gray-100"}`}>
          {pages.map((page) => {
            const open = openId === page.id;
            return (
              <div key={page.id}>
                <button
                  onClick={() => setOpenId(open ? null : page.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {open ? <ChevronDown className={`w-4 h-4 ${s.textMuted}`} /> : <ChevronRight className={`w-4 h-4 ${s.textMuted}`} />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${s.textPrimary}`}>
                      /{page.slug === "home" ? "" : page.slug}
                      <span className={`ml-2 text-[10px] font-normal uppercase tracking-wide ${s.textMuted}`}>{page.pageType}</span>
                    </p>
                    {page.metaTitle && <p className={`text-xs truncate ${s.textSecondary}`}>{page.metaTitle}</p>}
                  </div>
                  {!page.isPublished && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Unpublished</span>
                  )}
                </button>
                {open && <PageEditor page={page} s={s} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
