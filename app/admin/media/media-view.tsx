"use client";

import { useActionState, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SiteConfig } from "@/lib/types";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { Upload, Trash2, X, ZoomIn, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { uploadMedia, deleteMedia, type UploadResult } from "../_actions/media";

export type MediaItem = { id: string; url: string; filename: string; alt: string | null; created_at: string };

function MediaInner({ items, publicUrlBase }: { items: MediaItem[]; publicUrlBase: string }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [upState, upAction, upPending] = useActionState<UploadResult | null, FormData>(uploadMedia, null);
  const [delState, delAction] = useActionState<UploadResult | null, FormData>(deleteMedia, null);

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-5 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Media Library</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>{items.length} image{items.length === 1 ? "" : "s"} · stored in your Supabase bucket.</p>
        </div>
      </div>

      {/* Upload form */}
      <form
        ref={formRef}
        action={upAction}
        onSubmit={() => setTimeout(() => formRef.current?.reset(), 100)}
        className={`border-2 border-dashed rounded-2xl p-8 ${dark ? "border-white/[0.08]" : "border-gray-200"}`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-3 ${s.textMuted}`} />
        <p className={`text-sm font-medium text-center ${s.textSecondary} mb-4`}>Upload an image</p>

        <div className="max-w-md mx-auto space-y-3">
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            required
            className={`block w-full text-sm ${s.textSecondary} file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:text-white file:cursor-pointer`}
            style={{ ["--file-bg" as string]: "var(--color-primary)" }}
          />
          <input
            name="alt"
            placeholder="Alt text (recommended for SEO)"
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
          />
          <button
            type="submit"
            disabled={upPending}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition hover:scale-[1.02] disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
          >
            {upPending ? "Uploading…" : (<><Upload className="w-4 h-4" /> Upload</>)}
          </button>
          {upState && !upState.ok && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              <AlertCircle className="w-3.5 h-3.5" /> {upState.error}
            </div>
          )}
          {upState && upState.ok && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-700">
              <CheckCircle className="w-3.5 h-3.5" /> Uploaded.
            </div>
          )}
          <p className={`text-[11px] text-center ${s.textMuted}`}>JPG · PNG · WebP · GIF · AVIF · max 8MB</p>
        </div>
      </form>

      {items.length === 0 ? (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
          <p className={`text-sm ${s.textMuted}`}>No images yet — upload one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((img) => (
            <div key={img.id} className={`group relative rounded-2xl overflow-hidden aspect-square ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`}>
              <img src={img.url} alt={img.alt ?? img.filename} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button onClick={() => setPreview(img.url)} className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center hover:bg-white" title="Preview">
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </button>
                <button onClick={() => copyUrl(img.url)} className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center hover:bg-white" title="Copy URL">
                  <Copy className="w-4 h-4 text-gray-700" />
                </button>
                <form action={delAction}>
                  <input type="hidden" name="id" value={img.id} />
                  <button type="submit" className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center hover:bg-white" title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </form>
              </div>
              {copied === img.url && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-2 left-2 px-2 py-1 rounded bg-black/80 text-[10px] text-white font-bold">
                  URL copied
                </motion.div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-[10px] text-white font-medium truncate">{img.filename}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setPreview(null)}>
          <button className="absolute top-6 right-6 text-white/80 hover:text-white"><X className="w-8 h-8" /></button>
          <img src={preview} alt="Preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default function MediaView({
  items, publicUrlBase, config, counts,
}: { items: MediaItem[]; publicUrlBase: string; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <MediaInner items={items} publicUrlBase={publicUrlBase} />
    </AdminShell>
  );
}
