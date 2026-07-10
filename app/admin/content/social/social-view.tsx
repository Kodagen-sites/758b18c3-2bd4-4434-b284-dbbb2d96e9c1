"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { Plus, Trash2, Edit2, AlertCircle, Save, Eye, EyeOff, ArrowLeft, Share2 } from "lucide-react";
import { saveSocialLink, deleteSocialLink, toggleSocialLink, type ActionResult } from "@/app/admin/_actions/social";

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  displayLabel: string;
  active: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", twitter: "X (Twitter)", tiktok: "TikTok",
  linkedin: "LinkedIn", youtube: "YouTube", whatsapp: "WhatsApp", pinterest: "Pinterest",
  snapchat: "Snapchat", threads: "Threads", spotify: "Spotify", soundcloud: "SoundCloud",
  apple_music: "Apple Music", other: "Other",
};

function LinkForm({ initial, onDone }: { initial?: SocialLink; onDone: () => void }) {
  const { theme } = useAdminTheme();
  const s = getAdminStyles(theme === "dark");
  const [state, formAction, pending] = useActionState(saveSocialLink, null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const input = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;
  const label = `block text-xs font-medium mb-1.5 ${s.textSecondary}`;

  return (
    <form action={formAction} className={`p-4 rounded-xl border space-y-3 ${s.cardBg} ${s.cardBorder}`}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={label}>Platform</label>
          <select name="platform" defaultValue={initial?.platform ?? "instagram"} className={input}>
            {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={label}>Profile URL</label>
          <input name="url" defaultValue={initial?.url ?? ""} required className={input} placeholder="https://instagram.com/yourbusiness" />
        </div>
      </div>
      <div>
        <label className={label}>Display label (optional)</label>
        <input name="displayLabel" defaultValue={initial?.displayLabel ?? ""} className={input} placeholder="@yourbusiness" />
      </div>
      {state && !state.ok && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition">
          <Save className="w-4 h-4" /> {pending ? "Saving…" : initial ? "Save changes" : "Add link"}
        </button>
        <button type="button" onClick={onDone} className={`px-4 py-2 rounded-lg text-sm ${s.textSecondary} hover:underline`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function LinkRow({ link, onEdit, dark, s }: { link: SocialLink; onEdit: () => void; dark: boolean; s: ReturnType<typeof getAdminStyles> }) {
  const [, toggleAction, togglePending] = useActionState(toggleSocialLink, null);
  const [, deleteAction, delPending] = useActionState(deleteSocialLink, null);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!link.active ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${s.textPrimary}`}>
          {PLATFORM_LABELS[link.platform] ?? link.platform}
          {link.displayLabel && <span className={`ml-2 font-normal ${s.textSecondary}`}>{link.displayLabel}</span>}
        </p>
        <p className={`text-xs truncate ${s.textMuted}`}>{link.url}</p>
      </div>
      <form action={toggleAction}>
        <input type="hidden" name="id" value={link.id} />
        <input type="hidden" name="active" value={String(!link.active)} />
        <button type="submit" disabled={togglePending} title={link.active ? "Hide from site" : "Show on site"}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition">
          {link.active ? <Eye className={`w-4 h-4 ${s.textSecondary}`} /> : <EyeOff className={`w-4 h-4 ${s.textMuted}`} />}
        </button>
      </form>
      <button onClick={onEdit} title="Edit" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition">
        <Edit2 className="w-4 h-4 text-blue-500" />
      </button>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={link.id} />
        <button type="submit" disabled={delPending} title="Delete" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition">
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </form>
    </div>
  );
}

export default function SocialView({ links }: { links: SocialLink[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link href="/admin/content" className={`inline-flex items-center gap-1 text-xs mb-4 ${s.textSecondary} hover:underline`}>
        <ArrowLeft className="w-3 h-3" /> Content
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Social Links</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Shown in your site&apos;s footer and contact page.</p>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Add link
          </button>
        )}
      </div>

      {adding && <div className="mb-4"><LinkForm onDone={() => setAdding(false)} /></div>}

      {links.length === 0 && !adding ? (
        <div className={`rounded-xl border p-10 text-center ${s.cardBg} ${s.cardBorder}`}>
          <Share2 className={`w-8 h-8 mx-auto mb-3 ${s.textMuted}`} />
          <p className={`font-medium ${s.textPrimary}`}>No social links yet</p>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Add your profiles so customers can find you.</p>
        </div>
      ) : (
        <div className={`rounded-xl border divide-y ${s.cardBg} ${s.cardBorder} ${dark ? "divide-white/[0.06]" : "divide-gray-100"}`}>
          {links.map((link) =>
            editingId === link.id ? (
              <div key={link.id} className="p-3">
                <LinkForm initial={link} onDone={() => setEditingId(null)} />
              </div>
            ) : (
              <LinkRow key={link.id} link={link} dark={dark} s={s} onEdit={() => { setEditingId(link.id); setAdding(false); }} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
