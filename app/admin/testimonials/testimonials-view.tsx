"use client";

import { useState, useActionState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Star, Edit2, Trash2, Check, AlertCircle, Save,
  MessageSquare, Eye, EyeOff, Sparkles,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import type { SiteConfig } from "@/lib/types";
import {
  createTestimonial, updateTestimonial, deleteTestimonial,
  toggleTestimonialActive, toggleTestimonialFeatured,
  type ActionResult,
} from "../_actions/testimonials";

export type AdminTestimonial = {
  id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  body: string;
  rating: number;
  featured: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
};

// ───────────────────────────────────────────────────────
// Inline visibility/feature toggle buttons
// ───────────────────────────────────────────────────────

function ToggleActiveButton({ t, s }: { t: AdminTestimonial; s: ReturnType<typeof getAdminStyles> }) {
  const [, action, pending] = useActionState<ActionResult | null, FormData>(toggleTestimonialActive, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={t.id} />
      <input type="hidden" name="active" value={t.active ? "false" : "true"} />
      <button type="submit" disabled={pending}
        className={`p-2 rounded-lg ${s.hoverBg} disabled:opacity-50`}
        title={t.active ? "Hide from site" : "Show on site"}>
        {t.active
          ? <Eye className={`w-4 h-4 ${s.textSecondary}`} />
          : <EyeOff className={`w-4 h-4 text-amber-500`} />}
      </button>
    </form>
  );
}

function ToggleFeaturedButton({ t, s }: { t: AdminTestimonial; s: ReturnType<typeof getAdminStyles> }) {
  const [, action, pending] = useActionState<ActionResult | null, FormData>(toggleTestimonialFeatured, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={t.id} />
      <input type="hidden" name="featured" value={t.featured ? "false" : "true"} />
      <button type="submit" disabled={pending}
        className={`p-2 rounded-lg ${s.hoverBg} disabled:opacity-50`}
        title={t.featured ? "Unfeature" : "Feature on home page"}>
        <Sparkles className={`w-4 h-4 ${t.featured ? "text-amber-500 fill-amber-500" : s.textMuted}`} />
      </button>
    </form>
  );
}

function DeleteButton({ id, s }: { id: string; s: ReturnType<typeof getAdminStyles> }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteTestimonial, null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className={`p-2 rounded-lg ${s.hoverBg}`} title="Delete">
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      {state && !state.ok && <span className="text-[10px] text-red-500 font-semibold pr-1">{state.error}</span>}
      <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
        {pending ? "…" : "Delete"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={`px-2 py-1.5 rounded-lg text-[11px] font-medium ${s.hoverBg} ${s.textSecondary}`}>
        Cancel
      </button>
    </form>
  );
}

// ───────────────────────────────────────────────────────
// Create / Edit modal
// ───────────────────────────────────────────────────────

function TestimonialModal({
  onClose, edit, dark, s,
}: {
  onClose: () => void; edit: AdminTestimonial | null; dark: boolean; s: ReturnType<typeof getAdminStyles>;
}) {
  const action = edit ? updateTestimonial : createTestimonial;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const [rating, setRating] = useState<number>(edit?.rating ?? 5);
  const [featured, setFeatured] = useState<boolean>(edit?.featured ?? false);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 700);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Flex-wrapper centering — framer-motion writes an inline `transform`,
          which silently kills Tailwind -translate-x/y-1/2 centering and left
          the panel's lower half (incl. the submit button) off-screen. */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-lg ${s.cardBg} rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto`}
      >
        <div className={`p-6 border-b ${s.borderLight} flex items-center justify-between`}>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>{edit ? "Edit Testimonial" : "Add Testimonial"}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${s.hoverBg}`}><X className={`w-4 h-4 ${s.textSecondary}`} /></button>
        </div>

        {state?.ok ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <h3 className={`font-bold ${s.textPrimary} mb-1`}>{edit ? "Updated!" : "Added!"}</h3>
            <p className={`text-sm ${s.textSecondary}`}>Live on your site immediately.</p>
          </motion.div>
        ) : (
          <form action={formAction} className="p-6 space-y-4">
            {edit && <input type="hidden" name="id" value={edit.id} />}
            <input type="hidden" name="rating" value={rating} />
            <input type="hidden" name="featured" value={featured ? "true" : "false"} />

            {state && !state.ok && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Author Name</label>
                <input name="author_name" type="text" required defaultValue={edit?.author_name || ""} placeholder="Adaeze Okonkwo" className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Role / Context</label>
                <input name="author_role" type="text" defaultValue={edit?.author_role || ""} placeholder="Repeat guest" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Review</label>
              <textarea name="body" required rows={4} defaultValue={edit?.body || ""} placeholder="Share what they said about you…" className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Avatar URL (optional)</label>
              <input name="author_avatar" type="url" defaultValue={edit?.author_avatar || ""} placeholder="https://… (leave blank for initials)" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Rating</label>
                <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl border" style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgb(229 231 235)" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5">
                      <Star className={`w-5 h-5 ${n <= rating ? "fill-amber-400 text-amber-400" : s.textMuted}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Sort Order</label>
                <input name="sort_order" type="number" defaultValue={edit?.sort_order ?? 0} className={inputCls} />
              </div>
            </div>

            <button type="button" onClick={() => setFeatured(!featured)}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${s.cardBorder} ${s.hoverBg} ${s.textSecondary}`}>
              <Sparkles className={`w-4 h-4 ${featured ? "text-amber-500 fill-amber-500" : s.textMuted}`} />
              <span className="flex-1 text-left">Feature on home page</span>
              <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${featured ? "bg-amber-500 justify-end" : `${dark ? "bg-white/[0.08]" : "bg-gray-200"} justify-start`}`}>
                <span className="w-4 h-4 bg-white rounded-full shadow" />
              </span>
            </button>

            <button type="submit" disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
              <Save className="w-4 h-4" />
              {pending ? "Saving…" : (edit ? "Update Testimonial" : "Add Testimonial")}
            </button>
          </form>
        )}
      </motion.div>
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────

function TestimonialsContent({ testimonials }: { testimonials: AdminTestimonial[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);

  const visible = testimonials.filter((t) => t.active).length;
  const featured = testimonials.filter((t) => t.featured && t.active).length;
  const avgRating = testimonials.length > 0
    ? (testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length).toFixed(1)
    : "—";

  return (
    <>
      <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Testimonials</h1>
            <p className={`text-sm mt-1 ${s.textSecondary}`}>Reviews shown on /testimonials, /about, and the home page.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
          >
            <Plus className="w-4 h-4" /> Add Testimonial
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: testimonials.length, color: "text-blue-500", icon: MessageSquare },
            { label: "Live on Site", value: visible, color: "text-green-500", icon: Eye },
            { label: "Avg Rating", value: avgRating, color: "text-amber-500", icon: Star },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                  <div className={stat.color}><Icon className="w-5 h-5" /></div>
                </div>
                <div>
                  <p className={`text-xl font-bold ${s.textPrimary}`}>{stat.value}</p>
                  <p className={`text-xs ${s.textMuted}`}>{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* List */}
        {testimonials.length === 0 ? (
          <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
            <MessageSquare className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
            <p className={`text-sm font-medium ${s.textSecondary}`}>No testimonials yet</p>
            <p className={`text-xs ${s.textMuted} mt-1`}>Click &ldquo;Add Testimonial&rdquo; to put your first review on the site.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t) => (
              <motion.div
                key={t.id}
                layout
                className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-5 flex flex-col gap-3 ${!t.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {t.author_avatar ? (
                    <img src={t.author_avatar} alt={t.author_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
                      {t.author_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm ${s.textPrimary} truncate`}>{t.author_name}</p>
                      {t.featured && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-500 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> FEATURED
                        </span>
                      )}
                    </div>
                    {t.author_role && <p className={`text-xs ${s.textMuted} truncate`}>{t.author_role}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < t.rating ? "fill-amber-400 text-amber-400" : s.textMuted}`} />
                    ))}
                  </div>
                </div>

                <p className={`text-sm leading-relaxed ${s.textSecondary} line-clamp-4`}>&ldquo;{t.body}&rdquo;</p>

                <div className={`flex items-center justify-between pt-3 border-t ${s.borderLight} -mx-5 px-5`}>
                  <p className={`text-[10px] ${s.textMuted}`}>
                    {new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <ToggleFeaturedButton t={t} s={s} />
                    <ToggleActiveButton t={t} s={s} />
                    <button onClick={() => { setEditing(t); setShowModal(true); }} className={`p-2 rounded-lg ${s.hoverBg}`} title="Edit">
                      <Edit2 className={`w-4 h-4 ${s.textSecondary}`} />
                    </button>
                    <DeleteButton id={t.id} s={s} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <TestimonialModal onClose={() => setShowModal(false)} edit={editing} dark={dark} s={s} />
        )}
      </AnimatePresence>
    </>
  );
}

export default function TestimonialsView({
  testimonials, config, counts,
}: { testimonials: AdminTestimonial[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <TestimonialsContent testimonials={testimonials} />
    </AdminShell>
  );
}
