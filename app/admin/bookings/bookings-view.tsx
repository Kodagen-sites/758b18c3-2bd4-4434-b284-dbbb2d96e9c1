"use client";

import { useState, useActionState, useEffect } from "react";
import AdminShell from "@/components/admin/admin-shell";
import AdminDrawer from "@/components/admin/admin-drawer";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  Search, Phone, Mail, MessageSquare, Check, X as XIcon, LogIn, LogOut,
  CalendarCheck, AlertCircle, Users, Moon, Wallet, BedDouble, Clock, Plus,
  User, Calendar, CheckCircle, DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SiteConfig } from "@/lib/types";
import type { Booking } from "@/lib/admin-types";
import {
  confirmBooking, checkInBooking, checkOutBooking, cancelBooking,
  reassignBookingRoom, markNoShow, rescheduleBooking, modifyStay,
  type ActionResult,
} from "../_actions/bookings";
import MiniFloorPlanPicker, { type PickableRoom } from "@/components/admin/mini-floor-plan-picker";
import { useMasked } from "@/lib/use-masked";
import { createAdminBooking, type BookingResult } from "../_actions/admin-booking";

/** Room data for the in-drawer floor-plan picker. Computed page-side from active bookings. */
export type RoomOption = PickableRoom;

// ─── Status config ─────────────────────────────────────

const statusConfig: Record<Booking["status"], { label: string; dot: string; text: string; bg: string; ring: string }> = {
  pending:     { label: "Pending",     dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  confirmed:   { label: "Confirmed",   dot: "bg-blue-400",  text: "text-blue-600",  bg: "bg-blue-500/10",  ring: "ring-blue-500/20" },
  checked_in:  { label: "Checked In",  dot: "bg-green-400", text: "text-green-600", bg: "bg-green-500/10", ring: "ring-green-500/20" },
  checked_out: { label: "Checked Out", dot: "bg-gray-400",  text: "text-gray-600",  bg: "bg-gray-500/10",  ring: "ring-gray-500/20" },
  cancelled:   { label: "Cancelled",   dot: "bg-red-400",   text: "text-red-600",   bg: "bg-red-500/10",   ring: "ring-red-500/20" },
  no_show:     { label: "No Show",     dot: "bg-orange-400", text: "text-orange-600", bg: "bg-orange-500/10", ring: "ring-orange-500/20" },
};

function StatusPill({ status }: { status: Booking["status"] }) {
  const c = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text} ring-1 ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: Booking["paymentStatus"] }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 ring-1 ring-green-500/30">
        ✓ Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
      Not paid
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

/** "Today" / "Tomorrow" highlight for stay dates so reception spots them at a glance. */
function dayBadge(iso: string): { label: string; cls: string } | null {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diff === 0)  return { label: "Today",     cls: "bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30" };
  if (diff === 1)  return { label: "Tomorrow",  cls: "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/25" };
  if (diff === -1) return { label: "Yesterday", cls: "bg-gray-500/15 text-gray-500 ring-1 ring-gray-500/20" };
  return null;
}

// ─── Detail drawer body ───────────────────────────────

function BookingDetail({ booking, rooms }: { booking: Booking; rooms: RoomOption[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const m = useMasked();

  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const created = new Date(booking.createdAt);
  const showAssign = booking.status === "pending" || booking.status === "confirmed";

  return (
    <>
      {/* Reference + status + payment */}
      <div className={`p-3 rounded-xl ${s.sectionBg} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${s.textMuted}`}>Reference</p>
            <p className={`text-sm font-mono font-bold ${s.textPrimary} truncate`}>{booking.id}</p>
          </div>
          <StatusPill status={booking.status} />
        </div>
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${s.textMuted}`}>Payment</p>
          <PaymentBadge status={booking.paymentStatus} />
        </div>
      </div>

      {/* Assigned room — re-assignable until check-in. When the guest is
          about to check in (status=confirmed) we open the floor-plan picker by
          default so the front desk sees what's free before pressing the button. */}
      {showAssign ? (
        <AssignRoomPicker
          booking={booking}
          rooms={rooms}
          s={s}
          dark={dark}
          alwaysOpen={booking.status === "confirmed"}
        />
      ) : (
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${s.textMuted}`}>Assigned room</p>
          <div className={`flex items-center gap-2 p-2.5 rounded-xl ${s.sectionBg}`}>
            <BedDouble className={`w-4 h-4 ${s.textSecondary}`} />
            <span className={`text-sm font-bold ${s.textPrimary}`}>{booking.roomNumber}</span>
            <span className={`text-xs ${s.textMuted}`}>· {booking.roomType}</span>
          </div>
        </div>
      )}

      {/* Stay metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={Moon}      label="Check-in"  value={checkInDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} sub={checkInDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} s={s} />
        <Metric icon={Clock}     label="Check-out" value={checkOutDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} sub={checkOutDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} s={s} />
        <Metric icon={BedDouble} label="Room"      value={booking.roomType}                                  sub={`${booking.nights} night${booking.nights === 1 ? "" : "s"}`} s={s} />
        <Metric icon={Users}     label="Guests"    value={String(booking.guests)}                            s={s} />
        <Metric icon={Wallet}    label="Total"     value={m.money(booking.totalPrice)}         sub="No payment recorded" s={s} colSpan={2} />
      </div>

      {/* Guest contact */}
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Guest</p>
        <div className={`p-3 rounded-xl ${s.sectionBg} space-y-2`}>
          <div className="flex items-center gap-2 text-sm">
            <Mail className={`w-3.5 h-3.5 ${s.textMuted}`} />
            <a href={`mailto:${booking.guestEmail}`} className={`${s.textSecondary} hover:underline truncate`}>{m.email(booking.guestEmail) || "No email"}</a>
          </div>
          {booking.guestPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className={`w-3.5 h-3.5 ${s.textMuted}`} />
              <a href={`tel:${booking.guestPhone}`} className={`${s.textSecondary} hover:underline`}>{m.phone(booking.guestPhone)}</a>
            </div>
          )}
        </div>
      </div>

      {/* Special requests */}
      {booking.specialRequests && (
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Special requests</p>
          <p className={`text-sm leading-relaxed ${s.textSecondary} ${s.sectionBg} rounded-xl p-3`}>{booking.specialRequests}</p>
        </div>
      )}

      {/* Quick contact buttons */}
      <div className="grid grid-cols-3 gap-2">
        {booking.guestPhone && (
          <a href={`tel:${booking.guestPhone}`}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold ${s.cardBorder} ${s.textSecondary} ${s.hoverBg}`}>
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        )}
        <a href={`mailto:${booking.guestEmail}?subject=Booking ${booking.id}`}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold ${s.cardBorder} ${s.textSecondary} ${s.hoverBg}`}>
          <Mail className="w-3.5 h-3.5" /> Email
        </a>
        {booking.guestPhone && (
          <a href={`https://wa.me/${booking.guestPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ backgroundColor: "#25D366" }}>
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </a>
        )}
      </div>

      <p className={`text-[10px] ${s.textMuted} text-center pt-2`}>
        Booked {created.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} at {created.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </>
  );
}

function Metric({
  icon: Icon, label, value, sub, s, colSpan,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  s: ReturnType<typeof getAdminStyles>;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={`p-3 rounded-xl ${s.sectionBg} ${colSpan === 2 ? "col-span-2" : ""}`}>
      <div className={`flex items-center gap-1.5 mb-1.5 ${s.textMuted}`}>
        <Icon className="w-3 h-3" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-bold ${s.textPrimary}`}>{value}</p>
      {sub && <p className={`text-[11px] ${s.textMuted} mt-0.5`}>{sub}</p>}
    </div>
  );
}

// ─── Room assignment picker ────────────────────────────

function AssignRoomPicker({
  booking, rooms, s, dark, alwaysOpen,
}: {
  booking: Booking;
  rooms: RoomOption[];
  s: ReturnType<typeof getAdminStyles>;
  dark: boolean;
  /** When true, the floor-plan picker is open by default (used during check-in). */
  alwaysOpen?: boolean;
}) {
  const [open, setOpen] = useState<boolean>(alwaysOpen ?? false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(reassignBookingRoom, null);
  const roomsOfType = rooms.filter((r) => r.type === booking.roomType);

  // Trigger the server action programmatically when the user picks a room on
  // the floor plan. This way we don't need a form per cell — one shared form.
  function pickRoom(resourceId: string) {
    if (resourceId === booking.resourceId) return;
    setPendingId(resourceId);
    const fd = new FormData();
    fd.append("reference", booking.id);
    fd.append("resourceId", resourceId);
    action(fd);
  }

  // Reset pending when server responds
  useEffect(() => {
    if (state) setPendingId(null);
    if (state?.ok && !alwaysOpen) setOpen(false);
  }, [state, alwaysOpen]);

  if (!open) {
    return (
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${s.textMuted}`}>Assigned room</p>
        <div className={`flex items-center justify-between p-2.5 rounded-xl ${s.sectionBg}`}>
          <div className="flex items-center gap-2">
            <BedDouble className={`w-4 h-4 ${s.textSecondary}`} />
            <span className={`text-sm font-bold ${s.textPrimary}`}>{booking.roomNumber}</span>
            <span className={`text-xs ${s.textMuted}`}>· {booking.roomType}</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
          >
            Open floor plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${s.textMuted}`}>
          {alwaysOpen ? "Pick a room to check in" : "Move to which room?"}
        </p>
        {!alwaysOpen && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`text-[10px] font-semibold ${s.textMuted} hover:opacity-70`}
          >
            Close
          </button>
        )}
      </div>

      <MiniFloorPlanPicker
        rooms={roomsOfType}
        currentRoomId={booking.resourceId}
        onPick={pickRoom}
        pendingId={pending ? pendingId : null}
        errorMessage={state && !state.ok ? state.error : null}
      />
    </div>
  );
}

// ─── Action footer ─────────────────────────────────────

function BookingActions({ booking, onAction }: { booking: Booking; onAction: () => void }) {
  const [confirmState, confirmAction, confirmPending] = useActionState<ActionResult | null, FormData>(confirmBooking, null);
  const [checkInState, checkInAction, checkInPending] = useActionState<ActionResult | null, FormData>(checkInBooking, null);
  const [checkOutState, checkOutAction, checkOutPending] = useActionState<ActionResult | null, FormData>(checkOutBooking, null);
  const [cancelState, cancelAction, cancelPending] = useActionState<ActionResult | null, FormData>(cancelBooking, null);
  const [noShowState, noShowAction, noShowPending] = useActionState<ActionResult | null, FormData>(markNoShow, null);
  const [reschedState, reschedAction, reschedPending] = useActionState<ActionResult | null, FormData>(rescheduleBooking, null);
  const [modifyState, modifyAction, modifyPending] = useActionState<ActionResult | null, FormData>(modifyStay, null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showModify, setShowModify] = useState(false);

  // Close drawer once any action lands successfully
  useEffect(() => {
    if (confirmState?.ok || checkInState?.ok || checkOutState?.ok || cancelState?.ok || noShowState?.ok || reschedState?.ok || modifyState?.ok) {
      const t = setTimeout(onAction, 350);
      return () => clearTimeout(t);
    }
  }, [confirmState, checkInState, checkOutState, cancelState, noShowState, reschedState, modifyState, onAction]);

  const lastError =
    (confirmState && !confirmState.ok && confirmState.error) ||
    (checkInState && !checkInState.ok && checkInState.error) ||
    (checkOutState && !checkOutState.ok && checkOutState.error) ||
    (cancelState && !cancelState.ok && cancelState.error) ||
    null;

  const isTerminal = booking.status === "checked_out" || booking.status === "cancelled" || booking.status === "no_show";
  const canModify = booking.status === "pending" || booking.status === "confirmed";
  const canExtend = booking.status === "confirmed" || booking.status === "checked_in";

  const allErrors = [lastError,
    noShowState && !noShowState.ok ? noShowState.error : null,
    reschedState && !reschedState.ok ? reschedState.error : null,
    modifyState && !modifyState.ok ? modifyState.error : null,
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      {allErrors.map((e, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          <AlertCircle className="w-3.5 h-3.5" /> {e}
        </div>
      ))}

      {isTerminal ? (
        <p className="text-xs text-center text-gray-500 py-2">
          {booking.status === "checked_out" ? "Booking complete" : booking.status === "no_show" ? "Guest did not arrive" : "Booking cancelled"}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Primary action */}
          <div className="flex gap-2">
            {booking.status === "pending" && (
              <form action={confirmAction} className="flex-1">
                <input type="hidden" name="reference" value={booking.id} />
                <button type="submit" disabled={confirmPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
                  <Check className="w-4 h-4" /> {confirmPending ? "Confirming…" : "Confirm booking"}
                </button>
              </form>
            )}
            {booking.status === "confirmed" && (
              <form action={checkInAction} className="flex-1">
                <input type="hidden" name="reference" value={booking.id} />
                <button type="submit" disabled={checkInPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition hover:scale-[1.02]">
                  <LogIn className="w-4 h-4" /> {checkInPending ? "Checking in…" : "Check in guest"}
                </button>
              </form>
            )}
            {booking.status === "checked_in" && (
              <form action={checkOutAction} className="flex-1">
                <input type="hidden" name="reference" value={booking.id} />
                <button type="submit" disabled={checkOutPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-60 transition hover:scale-[1.02]">
                  <LogOut className="w-4 h-4" /> {checkOutPending ? "Checking out…" : "Check out guest"}
                </button>
              </form>
            )}
          </div>

          {/* Secondary actions row */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* No-show — only for confirmed bookings */}
            {booking.status === "confirmed" && (
              <form action={noShowAction}>
                <input type="hidden" name="reference" value={booking.id} />
                <button type="submit" disabled={noShowPending}
                  className="w-full py-2 rounded-lg text-[11px] font-semibold border border-orange-500/20 text-orange-600 hover:bg-orange-500/10 disabled:opacity-60">
                  {noShowPending ? "…" : "No show"}
                </button>
              </form>
            )}

            {/* Reschedule — pending or confirmed */}
            {canModify && (
              <button type="button" onClick={() => setShowReschedule(!showReschedule)}
                className="py-2 rounded-lg text-[11px] font-semibold border border-gray-300/40 text-gray-600 hover:bg-gray-100/60 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]">
                Reschedule
              </button>
            )}

            {/* Extend/shorten stay — confirmed or checked in */}
            {canExtend && (
              <button type="button" onClick={() => setShowModify(!showModify)}
                className="py-2 rounded-lg text-[11px] font-semibold border border-gray-300/40 text-gray-600 hover:bg-gray-100/60 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]">
                {booking.status === "checked_in" ? "Extend stay" : "Modify stay"}
              </button>
            )}

            {/* Cancel */}
            {canModify && (
              <form action={cancelAction}>
                <input type="hidden" name="reference" value={booking.id} />
                <input type="hidden" name="reason" value="Cancelled by admin" />
                <button type="submit" disabled={cancelPending}
                  className="w-full py-2 rounded-lg text-[11px] font-semibold border border-red-500/20 text-red-600 hover:bg-red-500/10 disabled:opacity-60">
                  {cancelPending ? "…" : "Cancel"}
                </button>
              </form>
            )}
          </div>

          {/* Reschedule form (inline) */}
          {showReschedule && (
            <form action={reschedAction} className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reschedule to new dates</p>
              <div className="grid grid-cols-2 gap-2">
                <input name="checkIn" type="date" required className="px-3 py-2 rounded-lg border text-xs" />
                <input name="checkOut" type="date" required className="px-3 py-2 rounded-lg border text-xs" />
              </div>
              <input type="hidden" name="reference" value={booking.id} />
              <button type="submit" disabled={reschedPending}
                className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
                {reschedPending ? "Rescheduling…" : "Confirm reschedule"}
              </button>
            </form>
          )}

          {/* Modify stay form (inline) */}
          {showModify && (
            <form action={modifyAction} className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {booking.status === "checked_in" ? "Extend or shorten stay" : "Change checkout date"}
              </p>
              <input name="checkOut" type="date" required className="w-full px-3 py-2 rounded-lg border text-xs" />
              <input type="hidden" name="reference" value={booking.id} />
              <button type="submit" disabled={modifyPending}
                className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
                {modifyPending ? "Updating…" : "Update checkout"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────

// ─── New Booking Modal (walk-in / phone reservation) ──

function NewBookingModal({
  rooms, onClose,
}: {
  rooms: RoomOption[];
  onClose: () => void;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;

  const [state, formAction, pending] = useActionState<BookingResult | null, FormData>(createAdminBooking, null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [paidNow, setPaidNow] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  // Group rooms by type for the selector
  const roomsByType = new Map<string, RoomOption[]>();
  for (const r of rooms) {
    if (r.status !== "available") continue;
    if (!roomsByType.has(r.type)) roomsByType.set(r.type, []);
    roomsByType.get(r.type)!.push(r);
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`fixed z-[100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg ${s.cardBg} rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}
      >
        <div className={`p-6 border-b ${s.borderLight} flex items-center justify-between`}>
          <div>
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>New Booking</h2>
            <p className={`text-xs ${s.textMuted}`}>Walk-in or phone reservation</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${s.hoverBg}`}>
            <XIcon className={`w-4 h-4 ${s.textSecondary}`} />
          </button>
        </div>

        {state?.ok ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <h3 className={`font-bold ${s.textPrimary} mb-1`}>Booking Created!</h3>
            <p className={`text-sm font-mono font-bold ${s.textSecondary}`}>{state.reference}</p>
          </motion.div>
        ) : (
          <form action={formAction} className="p-6 space-y-4">
            <input type="hidden" name="roomId" value={selectedRoomId} />
            <input type="hidden" name="paidNow" value={paidNow ? "true" : "false"} />

            {state && !state.ok && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </div>
            )}

            {/* Guest details */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Guest name *</label>
              <div className="relative">
                <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
                <input name="name" type="text" required placeholder="Full name" className={`${inputCls} pl-10`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Email</label>
                <input name="email" type="email" placeholder="guest@email.com" className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Phone</label>
                <input name="phone" type="tel" placeholder="+234…" className={inputCls} />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Check-in *</label>
                <input name="checkIn" type="date" required defaultValue={today} className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Check-out *</label>
                <input name="checkOut" type="date" required defaultValue={tomorrow} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Guests</label>
              <input name="guests" type="number" min="1" max="20" defaultValue="2" className={inputCls} />
            </div>

            {/* Room selector — grouped by type, only available rooms */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Room *</label>
              {roomsByType.size === 0 ? (
                <p className={`text-xs ${s.textMuted} p-3 rounded-xl ${s.sectionBg}`}>No available rooms. Check dates or room status.</p>
              ) : (
                <div className={`space-y-2 max-h-48 overflow-y-auto p-2 rounded-xl border ${s.cardBorder} ${s.sectionBg}`}>
                  {Array.from(roomsByType.entries()).map(([type, typeRooms]) => (
                    <div key={type}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${s.textMuted}`}>{type}</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {typeRooms.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRoomId(r.id)}
                            className={`px-2 py-2 rounded-lg text-xs font-bold text-center transition ${
                              selectedRoomId === r.id
                                ? "text-white shadow-sm"
                                : `${s.textSecondary} ${dark ? "bg-white/[0.04] hover:bg-white/[0.08]" : "bg-white hover:bg-gray-50"} border ${s.cardBorder}`
                            }`}
                            style={selectedRoomId === r.id ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special requests */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Special requests</label>
              <textarea name="specialRequests" rows={2} placeholder="Any notes…" className={`${inputCls} resize-none`} />
            </div>

            {/* Payment toggle */}
            <button
              type="button"
              onClick={() => setPaidNow(!paidNow)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${s.cardBorder} ${s.hoverBg} ${s.textSecondary}`}
            >
              <DollarSign className={`w-4 h-4 ${paidNow ? "text-green-500" : s.textMuted}`} />
              <span className="flex-1 text-left">{paidNow ? "Paid at front desk" : "Pay later / on checkout"}</span>
              <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${paidNow ? "bg-green-500 justify-end" : `${dark ? "bg-white/[0.08]" : "bg-gray-200"} justify-start`}`}>
                <span className="w-4 h-4 bg-white rounded-full shadow" />
              </span>
            </button>

            <button
              type="submit"
              disabled={pending || !selectedRoomId}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
            >
              <CalendarCheck className="w-4 h-4" />
              {pending ? "Creating…" : "Create Booking"}
            </button>
          </form>
        )}
      </motion.div>
    </>
  );
}

function BookingsContent({ bookings, rooms }: { bookings: Booking[]; rooms: RoomOption[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const m = useMasked();
  // Reception-workflow filters — what a desk clerk actually thinks in:
  //   "who's checking in today?" → arrivals
  //   "Mr X just walked in to check out" → departures or in_house
  //   "this booking still needs confirmation" → pending
  type ViewFilter = "all" | "arrivals" | "in_house" | "departures" | "upcoming" | "pending" | "events" | "no_show" | "past";
  const [filter, setFilter] = useState<ViewFilter>("arrivals");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);

  type SortKey = "booked_desc" | "booked_asc" | "checkin_asc" | "checkin_desc";
  const [sort, setSort] = useState<SortKey>("booked_desc");

  const SORTERS: Record<SortKey, (a: Booking, b: Booking) => number> = {
    booked_desc:  (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    booked_asc:   (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
    checkin_asc:  (a, b) => +new Date(a.checkIn)   - +new Date(b.checkIn),
    checkin_desc: (a, b) => +new Date(b.checkIn)   - +new Date(a.checkIn),
  };

  // Date helpers
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (iso: string, d: Date) => {
    const x = new Date(iso); x.setHours(0, 0, 0, 0);
    return x.getTime() === d.getTime();
  };

  // Predicate per filter — pure, used both for the chip counts and the table
  const PREDICATES: Record<ViewFilter, (b: Booking) => boolean> = {
    all:        () => true,
    arrivals:   (b) => (b.status === "confirmed" || b.status === "pending") && isSameDay(b.checkIn, today),
    in_house:   (b) => b.status === "checked_in",
    departures: (b) => b.status === "checked_in" && isSameDay(b.checkOut, today),
    upcoming:   (b) => (b.status === "confirmed" || b.status === "pending") && new Date(b.checkIn) > tomorrow,
    pending:    (b) => b.status === "pending",
    events:     (b) => b.bookingType === "event",
    no_show:    (b) => b.status === "no_show",
    past:       (b) => b.status === "checked_out" || b.status === "cancelled" || b.status === "no_show",
  };

  // Search hits guest name OR booking reference OR room number OR email OR phone
  function matchesSearch(b: Booking): boolean {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q) ||
      b.roomNumber.toLowerCase().includes(q) ||
      b.guestEmail.toLowerCase().includes(q) ||
      b.guestPhone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  }

  const filtered = bookings.filter((b) => PREDICATES[filter](b) && matchesSearch(b)).sort(SORTERS[sort]);

  const counts = {
    all:        bookings.filter(PREDICATES.all).length,
    arrivals:   bookings.filter(PREDICATES.arrivals).length,
    in_house:   bookings.filter(PREDICATES.in_house).length,
    departures: bookings.filter(PREDICATES.departures).length,
    upcoming:   bookings.filter(PREDICATES.upcoming).length,
    pending:    bookings.filter(PREDICATES.pending).length,
    events:     bookings.filter(PREDICATES.events).length,
    no_show:    bookings.filter(PREDICATES.no_show).length,
    past:       bookings.filter(PREDICATES.past).length,
  };

  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Bookings</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Click any row to view details and take action.</p>
        </div>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Reception action board — click any tile to jump straight to that list */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Arrivals today"      value={counts.arrivals}   icon={LogIn}     color="text-amber-500" s={s} dark={dark}
          active={filter === "arrivals"}    onClick={() => setFilter("arrivals")}     hint="Confirmed bookings checking in today" />
        <Kpi label="In house now"        value={counts.in_house}   icon={BedDouble} color="text-green-500" s={s} dark={dark}
          active={filter === "in_house"}    onClick={() => setFilter("in_house")}     hint="Guests currently staying" />
        <Kpi label="Departures today"    value={counts.departures} icon={LogOut}    color="text-rose-500"  s={s} dark={dark}
          active={filter === "departures"}  onClick={() => setFilter("departures")}   hint="In-house guests checking out today" />
        <Kpi label="Pending confirmation" value={counts.pending}   icon={AlertCircle} color="text-purple-500" s={s} dark={dark}
          active={filter === "pending"}     onClick={() => setFilter("pending")}      hint="New bookings to confirm" />
      </div>

      {/* Filters + search */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-3 space-y-3`}>
        <div className="flex flex-wrap gap-1.5">
          {([
            { id: "arrivals",   label: "Today's arrivals" },
            { id: "in_house",   label: "In house" },
            { id: "departures", label: "Today's departures" },
            { id: "upcoming",   label: "Upcoming" },
            { id: "events",     label: "Events" },
            { id: "pending",    label: "Pending" },
            { id: "no_show",    label: "No shows" },
            { id: "past",       label: "Past" },
            { id: "all",        label: "All" },
          ] as const).map((f) => {
            const active = filter === f.id;
            const cnt = counts[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`
                }`}
                style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
              >
                {f.label}
                <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : `${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textMuted}`}`}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest name, room number, phone, email or reference…"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted} hover:opacity-70`} aria-label="Clear">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className={`appearance-none pl-3 pr-9 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
              title="Sort bookings"
            >
              <option value="booked_desc">Newest booking first</option>
              <option value="booked_asc">Oldest booking first</option>
              <option value="checkin_asc">Check-in date (soonest)</option>
              <option value="checkin_desc">Check-in date (latest)</option>
            </select>
            <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>▾</span>
          </div>
        </div>
      </div>

      {/* Full-width table */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarCheck className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
            <p className={`text-sm font-medium ${s.textSecondary}`}>No bookings found</p>
            <p className={`text-xs ${s.textMuted} mt-1`}>
              {bookings.length === 0
                ? "Bookings made from your website will appear here."
                : "Try a different filter or search term."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${s.borderLight}`}>
                  <Th s={s} className="hidden sm:table-cell">Room</Th>
                  <Th s={s}>Guest</Th>
                  <Th s={s} className="hidden lg:table-cell">Stay</Th>
                  <Th s={s} className="hidden xl:table-cell">Booked</Th>
                  <Th s={s} className="hidden md:table-cell">Reference</Th>
                  <Th s={s} className="hidden sm:table-cell text-right">Total</Th>
                  <Th s={s}>Status</Th>
                  <Th s={s} className="hidden md:table-cell">Payment</Th>
                </tr>
              </thead>
              <tbody className={s.divider}>
                {filtered.map((b) => {
                  const inBadge = dayBadge(b.checkIn);
                  const outBadge = dayBadge(b.checkOut);
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className={`${s.hoverBg} cursor-pointer transition-colors`}
                    >
                      {/* Room / Event — leads the row so reception can scan vertically */}
                      <td className={`px-4 py-4 hidden sm:table-cell`}>
                        <div className="flex items-center gap-2.5">
                          {b.bookingType === "event" ? (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold bg-purple-500/10 text-purple-600">
                              🎉
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textPrimary}`}>
                              {b.roomNumber}
                            </div>
                          )}
                          <div>
                            <p className={`text-xs font-bold ${s.textPrimary}`}>{b.bookingType === "event" ? b.roomType : b.roomNumber}</p>
                            <p className={`text-[10px] ${s.textMuted}`}>{b.bookingType === "event" ? "Event" : b.roomType}</p>
                          </div>
                        </div>
                      </td>

                      {/* Guest */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
                            {initials(b.guestName)}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${s.textPrimary}`}>{m.name(b.guestName)}</p>
                            <p className={`text-xs truncate ${s.textMuted}`}>{b.guestEmail ? m.email(b.guestEmail) : b.guestPhone ? m.phone(b.guestPhone) : "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Stay — with Today / Tomorrow callouts */}
                      <td className={`px-4 py-4 text-sm hidden lg:table-cell`}>
                        <div className="flex items-center gap-1.5">
                          {inBadge && (
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${inBadge.cls}`}>
                              {inBadge.label}
                            </span>
                          )}
                          <span className={s.textSecondary}>
                            {new Date(b.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] ${s.textMuted}`}>→</span>
                          {outBadge && (
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${outBadge.cls}`}>
                              {outBadge.label}
                            </span>
                          )}
                          <span className={`text-xs ${s.textMuted}`}>
                            {new Date(b.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                          <span className={`text-[11px] ${s.textMuted}`}>· {b.nights}N</span>
                        </div>
                      </td>

                      {/* Booked — actual date + time */}
                      <td className={`px-4 py-4 text-sm hidden xl:table-cell`}>
                        <p className={s.textSecondary}>
                          {new Date(b.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                        </p>
                        <p className={`text-[11px] font-mono ${s.textMuted}`}>
                          {new Date(b.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </p>
                      </td>

                      {/* Reference */}
                      <td className={`px-4 py-4 hidden md:table-cell`}>
                        <p className={`text-xs font-mono ${s.textMuted}`}>{b.id}</p>
                      </td>

                      <td className={`px-4 py-4 text-sm font-bold ${s.textPrimary} hidden sm:table-cell text-right`}>
                        {m.money(b.totalPrice)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill status={b.status} />
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <PaymentBadge status={b.paymentStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AdminDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? m.name(selected.guestName) : ""}
        subtitle={selected ? `Room ${selected.roomNumber} · ${selected.roomType} · ${selected.nights} night${selected.nights === 1 ? "" : "s"}` : undefined}
        badge={selected && <StatusPill status={selected.status} />}
        avatar={selected && (
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
            {initials(selected.guestName)}
          </div>
        )}
        actions={selected && <BookingActions booking={selected} onAction={() => setSelected(null)} />}
      >
        {selected && <BookingDetail booking={selected} rooms={rooms} />}
      </AdminDrawer>

      {/* New Booking modal */}
      <AnimatePresence>
        {showNewBooking && (
          <NewBookingModal rooms={rooms} onClose={() => setShowNewBooking(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Th({ children, s, className = "" }: { children: React.ReactNode; s: ReturnType<typeof getAdminStyles>; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted} ${className}`}>
      {children}
    </th>
  );
}

function Kpi({
  label, value, icon: Icon, color, s, dark, active, onClick, hint,
}: {
  label: string; value: number | string;
  icon: React.ComponentType<{ className?: string }>; color: string;
  s: ReturnType<typeof getAdminStyles>; dark: boolean;
  active?: boolean;
  onClick?: () => void;
  hint?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      title={hint}
      className={`text-left ${s.cardBg} rounded-2xl border p-4 flex items-center gap-3 transition ${
        active
          ? "shadow-md ring-2"
          : `${s.cardBorder} ${onClick ? "hover:shadow-md hover:scale-[1.01] cursor-pointer" : ""}`
      }`}
      style={active ? { ["--tw-ring-color" as string]: "var(--color-accent)", borderColor: "var(--color-accent)" } : undefined}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
        <div className={color}><Icon className="w-5 h-5" /></div>
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold ${s.textPrimary} truncate`}>{value}</p>
        <p className={`text-[11px] ${s.textMuted} truncate`}>{label}</p>
      </div>
    </Tag>
  );
}

export default function BookingsView({
  bookings, rooms, config, counts,
}: {
  bookings: Booking[];
  rooms: RoomOption[];
  config: SiteConfig;
  counts?: { bookings: number; inquiries: number };
}) {
  return (
    <AdminShell config={config} counts={counts}>
      <BookingsContent bookings={bookings} rooms={rooms} />
    </AdminShell>
  );
}
