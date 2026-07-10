"use client";

import { useState, useActionState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Edit2, Trash2, Save, Check, AlertCircle,
  Camera, PartyPopper, Heart, Calendar, Users, DollarSign, Clock,
  Image as ImageIcon,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import AdminDrawer from "@/components/admin/admin-drawer";
import ImagePickerModal from "@/components/admin/image-picker-modal";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import type { SiteConfig } from "@/lib/types";
import { createEvent, updateEvent, deleteEvent, type ActionResult } from "../_actions/events";
import { CURRENCY_SYMBOL } from "@/lib/currency";

export type AdminEvent = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  duration: string;
  capacity: string;
  active: boolean;
  createdAt: string;
};

// ─── Event Card ──────────────────────────────────────

function EventCard({ event, onClick, s, dark }: {
  event: AdminEvent; onClick: () => void;
  s: ReturnType<typeof getAdminStyles>; dark: boolean;
}) {
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden cursor-pointer hover:shadow-md transition-all`}
    >
      {event.image ? (
        <div className="h-40 overflow-hidden">
          <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`h-40 flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
          <Camera className={`w-10 h-10 ${s.textMuted}`} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`font-bold text-sm ${s.textPrimary}`}>{event.name}</h3>
          {!event.active && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-500/15 text-red-500">Inactive</span>
          )}
        </div>
        <p className={`text-xs ${s.textMuted} line-clamp-2 mb-3`}>{event.description}</p>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${s.textPrimary}`}>{CURRENCY_SYMBOL}{event.price.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            {event.duration && (
              <span className={`flex items-center gap-1 text-[11px] ${s.textMuted}`}>
                <Clock className="w-3 h-3" /> {event.duration}
              </span>
            )}
            {event.capacity && (
              <span className={`flex items-center gap-1 text-[11px] ${s.textMuted}`}>
                <Users className="w-3 h-3" /> {event.capacity}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create / Edit Modal ─────────────────────────────

function EventModal({ event, onClose, dark, s }: {
  event: AdminEvent | null; onClose: () => void;
  dark: boolean; s: ReturnType<typeof getAdminStyles>;
}) {
  const action = event ? updateEvent : createEvent;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const [imageUrl, setImageUrl] = useState(event?.image ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (state?.ok) { const t = setTimeout(onClose, 800); return () => clearTimeout(t); }
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
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>{event ? "Edit Event" : "Add Event Service"}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${s.hoverBg}`}><X className={`w-4 h-4 ${s.textSecondary}`} /></button>
        </div>

        {state?.ok ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <h3 className={`font-bold ${s.textPrimary}`}>{event ? "Updated!" : "Event Created!"}</h3>
          </motion.div>
        ) : (
          <form action={formAction} className="p-6 space-y-4">
            {event && <input type="hidden" name="id" value={event.id} />}
            <input type="hidden" name="image" value={imageUrl} />

            {state && !state.ok && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </div>
            )}

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Event name *</label>
              <input name="name" required defaultValue={event?.name ?? ""} placeholder="e.g. Wedding Photography, Birthday Party, Corporate Event" className={inputCls} />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Description</label>
              <textarea name="description" rows={3} defaultValue={event?.description ?? ""} placeholder="What's included in this package…" className={`${inputCls} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Price ({CURRENCY_SYMBOL}) *</label>
                <div className="relative">
                  <DollarSign className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
                  <input name="price" type="number" required defaultValue={event?.price ?? ""} placeholder="150000" className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Duration</label>
                <input name="duration" defaultValue={event?.duration ?? ""} placeholder="e.g. 4 hours, Full day" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Capacity</label>
              <input name="capacity" defaultValue={event?.capacity ?? ""} placeholder="e.g. Up to 200 guests, 2-10 people" className={inputCls} />
            </div>

            {/* Image */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Cover image</label>
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgb(229 231 235)" }}>
                  <img src={imageUrl} alt="Event" className="w-full h-36 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button type="button" onClick={() => setPickerOpen(true)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-900 bg-white/95 hover:bg-white shadow">Change</button>
                    <button type="button" onClick={() => setImageUrl("")} className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-white bg-red-600/90 hover:bg-red-600 shadow">Remove</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setPickerOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed text-sm font-medium ${dark ? "border-white/[0.08] text-gray-500" : "border-gray-200 text-gray-500"} transition-colors hover:opacity-70`}>
                  <ImageIcon className="w-4 h-4" /> Choose image
                </button>
              )}
            </div>

            <button type="submit" disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
              <Save className="w-4 h-4" /> {pending ? "Saving…" : (event ? "Update Event" : "Create Event")}
            </button>
          </form>
        )}
      </motion.div>
      </div>

      {pickerOpen && (
        <ImagePickerModal initialUrl={imageUrl} onPick={(url) => setImageUrl(url)} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}

// ─── Main page ───────────────────────────────────────

function EventsContent({ events }: { events: AdminEvent[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [selected, setSelected] = useState<AdminEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminEvent | null>(null);

  const [delState, delAction, delPending] = useActionState<ActionResult | null, FormData>(deleteEvent, null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Events & Services</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Photoshoots, weddings, birthdays — bookable services customers can pay for.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <Camera className="w-5 h-5 text-blue-500" />
          </div>
          <div><p className={`text-xl font-bold ${s.textPrimary}`}>{events.length}</p><p className={`text-[11px] ${s.textMuted}`}>Total events</p></div>
        </div>
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div><p className={`text-xl font-bold ${s.textPrimary}`}>{events.filter((e) => e.active).length}</p><p className={`text-[11px] ${s.textMuted}`}>Active</p></div>
        </div>
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
          <div><p className={`text-xl font-bold ${s.textPrimary}`}>{events.filter((e) => /wedding/i.test(e.name)).length}</p><p className={`text-[11px] ${s.textMuted}`}>Weddings</p></div>
        </div>
      </div>

      {/* Grid */}
      {events.length === 0 ? (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
          <PartyPopper className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
          <p className={`text-sm font-medium ${s.textSecondary}`}>No event services yet</p>
          <p className={`text-xs ${s.textMuted} mt-1`}>Add your first event package — photoshoots, weddings, corporate events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} onClick={() => setSelected(ev)} s={s} dark={dark} />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <AdminDrawer
        open={selected !== null}
        onClose={() => { setSelected(null); setConfirmDel(null); }}
        title={selected?.name ?? ""}
        subtitle={selected ? `${CURRENCY_SYMBOL}${selected.price.toLocaleString()}` : undefined}
        avatar={selected?.image ? (
          <img src={selected.image} alt={selected.name} className="w-11 h-11 rounded-xl object-cover" />
        ) : undefined}
        actions={selected && (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(selected); setShowModal(true); setSelected(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            {confirmDel !== selected.id ? (
              <button onClick={() => setConfirmDel(selected.id)} className={`p-3 rounded-xl ${s.hoverBg}`}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            ) : (
              <form action={delAction} className="flex gap-1">
                <input type="hidden" name="id" value={selected.id} />
                <button type="submit" disabled={delPending} className="px-3 py-3 rounded-xl text-[11px] font-bold text-white bg-red-600">
                  {delPending ? "…" : "Delete"}
                </button>
                <button type="button" onClick={() => setConfirmDel(null)} className={`px-3 py-3 rounded-xl text-[11px] ${s.textSecondary} ${s.hoverBg}`}>
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}
      >
        {selected && (
          <>
            {selected.description && (
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Description</p>
                <p className={`text-sm leading-relaxed ${s.textSecondary} ${s.sectionBg} rounded-xl p-3`}>{selected.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {selected.duration && (
                <div className={`p-3 rounded-xl ${s.sectionBg}`}>
                  <div className={`flex items-center gap-1.5 mb-1.5 ${s.textMuted}`}><Clock className="w-3 h-3" /><span className="text-[10px] font-semibold uppercase tracking-wider">Duration</span></div>
                  <p className={`text-sm font-bold ${s.textPrimary}`}>{selected.duration}</p>
                </div>
              )}
              {selected.capacity && (
                <div className={`p-3 rounded-xl ${s.sectionBg}`}>
                  <div className={`flex items-center gap-1.5 mb-1.5 ${s.textMuted}`}><Users className="w-3 h-3" /><span className="text-[10px] font-semibold uppercase tracking-wider">Capacity</span></div>
                  <p className={`text-sm font-bold ${s.textPrimary}`}>{selected.capacity}</p>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${s.sectionBg}`}>
              <div className={`flex items-center gap-1.5 mb-1.5 ${s.textMuted}`}><DollarSign className="w-3 h-3" /><span className="text-[10px] font-semibold uppercase tracking-wider">Price</span></div>
              <p className={`text-lg font-extrabold ${s.textPrimary}`}>{CURRENCY_SYMBOL}{selected.price.toLocaleString()}</p>
            </div>
          </>
        )}
      </AdminDrawer>

      {/* Modal */}
      <AnimatePresence>
        {showModal && <EventModal event={editing} onClose={() => setShowModal(false)} dark={dark} s={s} />}
      </AnimatePresence>
    </div>
  );
}

export default function EventsView({
  events, config, counts,
}: { events: AdminEvent[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <EventsContent events={events} />
    </AdminShell>
  );
}
