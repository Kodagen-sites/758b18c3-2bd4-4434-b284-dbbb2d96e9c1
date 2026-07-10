"use client";

import { useState, useActionState, useEffect } from "react";
import type { SiteConfig } from "@/lib/types";
import AdminShell from "@/components/admin/admin-shell";
import AdminDrawer from "@/components/admin/admin-drawer";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { fmtMoney } from "@/lib/currency";
import {
  Plus, Clock, Users, Edit2, Trash2, AlertCircle, Save, Pause, Play, CalendarCheck,
} from "lucide-react";
import {
  createService, updateService, deleteService, toggleServiceActive,
  type ActionResult,
} from "../_actions/services";

export type ServiceRow = {
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  capacity: number;
  active: boolean;
  image: string;
  upcoming: number;
};

function fmtDuration(min: number): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ServiceForm({
  initial, action, submitLabel, onDone,
}: {
  initial?: ServiceRow;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  submitLabel: string;
  onDone: () => void;
}) {
  const { theme } = useAdminTheme();
  const s = getAdminStyles(theme === "dark");
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const input = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;
  const label = `block text-xs font-medium mb-1.5 ${s.textSecondary}`;

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="oldName" value={initial.name} />}
      <div>
        <label className={label}>Service name</label>
        <input name="name" defaultValue={initial?.name ?? ""} required className={input} placeholder="e.g. Consultation, Haircut, Deep Clean" />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea name="description" defaultValue={initial?.description ?? ""} rows={3} className={input} placeholder="What the customer gets" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Price</label>
          <input name="price" type="number" min={0} step="0.01" defaultValue={initial?.price ?? ""} required className={input} />
        </div>
        <div>
          <label className={label}>Duration (minutes)</label>
          <input name="durationMinutes" type="number" min={0} step={5} defaultValue={initial?.durationMinutes || ""} className={input} placeholder="60" />
        </div>
      </div>
      <div>
        <label className={label}>Parallel capacity</label>
        <input name="capacity" type="number" min={1} max={50} defaultValue={initial?.capacity ?? 1} className={input} />
        <p className={`text-[11px] mt-1 ${s.textMuted}`}>
          How many of these can run at the same time — chairs, treatment rooms, staff members.
        </p>
      </div>
      <input type="hidden" name="image" value={initial?.image ?? ""} />

      {state && !state.ok && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
      >
        <Save className="w-4 h-4" /> {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function RowActions({ service, onEdit }: { service: ServiceRow; onEdit: () => void }) {
  const [, toggleAction, togglePending] = useActionState(toggleServiceActive, null);
  const [delState, deleteAction, delPending] = useActionState(deleteService, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <form action={toggleAction}>
        <input type="hidden" name="name" value={service.name} />
        <input type="hidden" name="active" value={String(!service.active)} />
        <button
          type="submit"
          disabled={togglePending}
          title={service.active ? "Pause bookings" : "Resume bookings"}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          {service.active ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-green-500" />}
        </button>
      </form>
      <button onClick={onEdit} title="Edit" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition">
        <Edit2 className="w-4 h-4 text-blue-500" />
      </button>
      {confirming ? (
        <form action={deleteAction}>
          <input type="hidden" name="name" value={service.name} />
          <button type="submit" disabled={delPending} className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition">
            {delPending ? "…" : "Confirm"}
          </button>
        </form>
      ) : (
        <button onClick={() => setConfirming(true)} title="Delete" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition">
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      )}
      {delState && !delState.ok && (
        <span className="text-[11px] text-red-500 max-w-[180px]">{delState.error}</span>
      )}
    </div>
  );
}

export default function ServicesView({
  config, counts, services,
}: {
  config: SiteConfig;
  counts?: { bookings?: number; inquiries?: number };
  services: ServiceRow[];
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);

  return (
    <AdminShell config={config} counts={counts}>
      <div className="p-4 md:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Services</h1>
            <p className={`text-sm mt-1 ${s.textSecondary}`}>
              What customers can book — price, duration, and how many can run at once.
            </p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Add service
          </button>
        </div>

        {services.length === 0 ? (
          <div className={`rounded-xl border p-10 text-center ${s.cardBg} ${s.cardBorder}`}>
            <CalendarCheck className={`w-8 h-8 mx-auto mb-3 ${s.textMuted}`} />
            <p className={`font-medium ${s.textPrimary}`}>No services yet</p>
            <p className={`text-sm mt-1 ${s.textSecondary}`}>
              Add your first bookable service — customers will be able to pick a time on your site.
            </p>
          </div>
        ) : (
          <div className={`rounded-xl border overflow-hidden ${s.cardBg} ${s.cardBorder}`}>
            {services.map((svc, i) => (
              <div
                key={svc.name}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-4 ${i > 0 ? `border-t ${s.cardBorder}` : ""} ${!svc.active ? "opacity-60" : ""}`}
              >
                <div className="flex-1 min-w-[180px]">
                  <p className={`font-semibold ${s.textPrimary}`}>
                    {svc.name}
                    {!svc.active && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-500">Paused</span>
                    )}
                  </p>
                  {svc.description && <p className={`text-xs mt-0.5 line-clamp-1 ${s.textSecondary}`}>{svc.description}</p>}
                </div>
                <div className={`text-sm font-semibold ${s.textPrimary}`}>{fmtMoney(svc.price)}</div>
                <div className={`flex items-center gap-1 text-xs ${s.textSecondary}`}>
                  <Clock className="w-3.5 h-3.5" /> {fmtDuration(svc.durationMinutes)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${s.textSecondary}`} title="Parallel capacity">
                  <Users className="w-3.5 h-3.5" /> ×{svc.capacity}
                </div>
                <div className={`text-xs ${s.textSecondary}`} title="Upcoming appointments">
                  {svc.upcoming > 0 ? `${svc.upcoming} upcoming` : "—"}
                </div>
                <RowActions service={svc} onEdit={() => setEditing(svc)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminDrawer open={adding} onClose={() => setAdding(false)} title="Add service">
        <ServiceForm action={createService} submitLabel="Create service" onDone={() => setAdding(false)} />
      </AdminDrawer>
      <AdminDrawer open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : "Edit"}>
        {editing && (
          <ServiceForm initial={editing} action={updateService} submitLabel="Save changes" onDone={() => setEditing(null)} />
        )}
      </AdminDrawer>
    </AdminShell>
  );
}
