"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Check, AlertCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  listSiteMedia, uploadMedia,
  type MediaItem, type UploadResult,
} from "@/app/admin/_actions/media";

/**
 * Reusable picker that lets admins choose an image from their site media
 * library OR upload a new one inline. Calls onPick(url) when chosen.
 */
export default function ImagePickerModal({
  onClose,
  onPick,
  initialUrl,
}: {
  onClose: () => void;
  onPick: (url: string) => void;
  initialUrl?: string;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, startLoading] = useTransition();
  const [selectedUrl, setSelectedUrl] = useState<string>(initialUrl ?? "");

  // Inline-upload state
  const [uploadState, uploadAction, uploadPending] =
    useActionState<UploadResult | null, FormData>(uploadMedia, null);

  const refresh = () => {
    startLoading(async () => {
      const fresh = await listSiteMedia();
      setItems(fresh);
    });
  };

  useEffect(() => { refresh(); }, []);

  // After successful upload, refresh + auto-select new image
  useEffect(() => {
    if (uploadState?.ok) {
      refresh();
      setSelectedUrl(uploadState.url);
    }
  }, [uploadState]);

  function handleConfirm() {
    if (selectedUrl) {
      onPick(selectedUrl);
      onClose();
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Flex-wrapper centering — framer-motion writes an inline `transform`,
          which silently kills Tailwind -translate-x/y-1/2 centering and left
          the panel's lower half (incl. the submit button) off-screen. */}
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className={`w-[95vw] max-w-3xl h-[80vh] ${s.cardBg} rounded-2xl shadow-2xl flex flex-col overflow-y-auto pointer-events-auto`}
      >
        {/* Header */}
        <div className={`p-5 border-b ${s.borderLight} flex items-center justify-between flex-shrink-0`}>
          <div>
            <h2 className={`text-base font-bold ${s.textPrimary}`}>Choose Image</h2>
            <p className={`text-xs ${s.textMuted}`}>Pick from your library or upload a new one.</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${s.hoverBg}`}>
            <X className={`w-4 h-4 ${s.textSecondary}`} />
          </button>
        </div>

        {/* Upload bar */}
        <div className={`p-4 border-b ${s.borderLight} flex-shrink-0`}>
          <form action={uploadAction} className="flex items-center gap-2">
            <label className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer text-sm font-medium ${s.cardBorder} ${s.hoverBg} ${s.textSecondary}`}>
              <Upload className={`w-4 h-4 ${s.textMuted}`} />
              <span className="flex-1">Upload new image (JPG/PNG/WebP, ≤8MB)</span>
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
            </label>
            {uploadPending && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${s.sectionBg} text-xs font-semibold ${s.textSecondary}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
              </div>
            )}
          </form>
          {uploadState && !uploadState.ok && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              <AlertCircle className="w-3.5 h-3.5" /> {uploadState.error}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className={`w-6 h-6 animate-spin ${s.textMuted}`} />
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <ImageIcon className={`w-10 h-10 mb-3 ${s.textMuted}`} />
              <p className={`text-sm font-medium ${s.textSecondary}`}>No images yet</p>
              <p className={`text-xs mt-1 ${s.textMuted}`}>Upload your first image above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((m) => {
                const selected = selectedUrl === m.url;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedUrl(m.url)}
                    onDoubleClick={() => { onPick(m.url); onClose(); }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selected ? "shadow-lg" : `${s.cardBorder} hover:opacity-90`
                    }`}
                    style={selected ? { borderColor: "var(--color-accent)" } : undefined}
                  >
                    <img
                      src={m.url}
                      alt={m.alt || m.filename}
                      className="w-full h-full object-cover"
                    />
                    {selected && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl">
                          <Check className="w-5 h-5 text-gray-900" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${s.borderLight} flex items-center justify-between gap-3 flex-shrink-0`}>
          <p className={`text-xs ${s.textMuted} truncate flex-1`}>
            {selectedUrl ? "Image selected" : "Click an image to select, or double-click to pick"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${s.hoverBg} ${s.textSecondary}`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedUrl}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
            >
              Use This Image
            </button>
          </div>
        </div>
      </motion.div>
      </div>
    </>
  );
}
