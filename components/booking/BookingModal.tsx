"use client";

/**
 * BookingModal (variant B3) — centered modal wizard for booking.
 *
 * Same 3-step flow as the drawer (Select → Details → Review) but presented
 * as a centered dialog. Best for fitness studios, classes, workshops, tours,
 * and consultations — where the selection step is the focal moment (class
 * type, session, tour package) and feels more natural at center-stage than
 * a side-panel.
 *
 * Submit POSTs to /api/reservations (or /api/bookings on fullstack tenant
 * builds), caches client-side, routes to /booking-confirmation. Same API
 * surface as BookingDrawer.
 *
 * STYLING NOTE: colors are Tailwind arbitrary values with CSS-variable
 * fallbacks — named token classes missing from a generated site's tailwind
 * config silently emit NO css (transparent panel). The hex fallbacks keep
 * the dialog opaque and readable under ANY config.
 *
 * MODES: `mode="stay" | "appointment"` — omitted → inferred from rooms
 * (all maxGuests <= 1 → appointment: single date + time slot, price per
 * session, no guests input).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, Loader2 } from "lucide-react";
import {
  type Room,
  type BookingDraft,
  type BookingMode,
  resolveBookingMode,
  buildTimeSlots,
  IS_TENANT_BUILD,
  postTenantBooking,
  cacheReservationLocally,
} from "./BookingDrawer";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  defaultRoomSlug?: string;
  locationName?: string;
  onConfirm?: (booking: BookingDraft) => Promise<void>;
  mode?: BookingMode;      // omit → inferred from rooms
  dayStart?: string;       // appointment mode: first bookable slot, "HH:mm"
  dayEnd?: string;         // appointment mode: sessions must end by this
  slotMinutes?: number;    // appointment mode: session length
}

export default function BookingModal({
  open,
  onClose,
  rooms,
  defaultRoomSlug,
  locationName,
  onConfirm,
  mode,
  dayStart = "09:00",
  dayEnd = "17:00",
  slotMinutes = 60,
}: BookingModalProps) {
  const router = useRouter();
  const appointment = resolveBookingMode(mode, rooms) === "appointment";
  const [step, setStep] = useState<"select" | "details" | "review">("select");
  const [roomSlug, setRoomSlug] = useState(defaultRoomSlug ?? rooms[0]?.slug ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [startTime, setStartTime] = useState("");
  const [guests, setGuests] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const room = rooms.find((r) => r.slug === roomSlug);
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86400000))
    : 0;
  // Appointment: flat price per session — never multiplied by nights.
  const subtotal = appointment ? (room?.pricePerNight ?? 0) : (room?.pricePerNight ?? 0) * nights;
  const slots = appointment ? buildTimeSlots(dayStart, dayEnd, slotMinutes) : [];
  const today = new Date().toISOString().slice(0, 10);

  // Reset to step 1 when modal opens
  useEffect(() => { if (open) { setStep("select"); setSubmitting(false); setError(null); } }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  const canProceedFromSelect = appointment
    ? Boolean(roomSlug && checkIn && startTime)
    : Boolean(roomSlug && checkIn && checkOut && nights > 0 && guests >= 1);
  const canProceedFromDetails = fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 6;

  async function handleConfirm() {
    if (!room) return;
    setSubmitting(true);
    setError(null);
    const draft: BookingDraft = {
      roomSlug,
      checkIn,
      checkOut: appointment ? checkIn : checkOut,
      guests: appointment ? 1 : guests,
      fullName, email, phone,
      totalCents: subtotal * 100, depositCents: 0,
      ...(appointment && startTime ? { startTime } : {}),
    };
    try {
      if (onConfirm) { await onConfirm(draft); return; }
      if (IS_TENANT_BUILD) {
        const data = await postTenantBooking({
          roomType: room.name,
          checkIn: draft.checkIn,
          checkOut: draft.checkOut,
          guests: draft.guests,
          name: fullName,
          email,
          phone,
          ...(draft.startTime ? { startTime: draft.startTime } : {}),
        });
        if (!data?.ok) throw new Error(data?.error || "Booking failed");
        if (data.payment?.authorization_url) { window.location.assign(data.payment.authorization_url); return; }
        const ref = data.reference ?? "";
        cacheReservationLocally(ref, draft as unknown as Record<string, unknown>);
        onClose();
        router.push(`/booking-confirmation?id=${encodeURIComponent(ref)}`);
        return;
      }
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Reservation failed");
      try {
        window.localStorage.setItem(
          `kodagen-reservation:${data.reservationId}`,
          JSON.stringify({ id: data.reservationId, status: "placed", ...draft, created_at: new Date().toISOString() }),
        );
      } catch { /* private mode */ }
      onClose();
      router.push(`/booking-confirmation?id=${encodeURIComponent(data.reservationId)}`);
    } catch (err: any) {
      console.error("Booking failed:", err);
      setError(err?.message ?? "Could not complete the booking. Please try again.");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
      <div className="relative bg-[var(--color-card,var(--color-bg,#141416))] text-[var(--color-ink,#f4f4f5)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border,rgba(255,255,255,0.14))]">
          <h2 className="text-base font-medium text-[var(--color-ink,#f4f4f5)]">
            {step === "select" ? (appointment ? "Book an appointment" : "Book your spot") : step === "details" ? "Your details" : "Review"}
            {locationName ? <span className="text-[var(--color-text-secondary,rgba(244,244,245,0.65))]"> · {locationName}</span> : null}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.1)]">
            <X size={18} className="text-[var(--color-text-secondary,rgba(244,244,245,0.65))]" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-[var(--color-border,rgba(255,255,255,0.14))]">
          <Dot active={step === "select"} done={step !== "select"} />
          <Dot active={step === "details"} done={step === "review"} />
          <Dot active={step === "review"} done={false} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "select" && (
            <div className="space-y-4">
              {rooms.length > 1 && (
                appointment ? (
                  <Labeled label="Service">
                    <select
                      value={roomSlug}
                      onChange={(e) => setRoomSlug(e.target.value)}
                      className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none appearance-none"
                    >
                      {rooms.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                    </select>
                  </Labeled>
                ) : (
                  <select
                    value={roomSlug}
                    onChange={(e) => setRoomSlug(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none"
                  >
                    {rooms.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                  </select>
                )
              )}
              {appointment ? (
                <>
                  <Labeled label="Date & time">
                    <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none" />
                  </Labeled>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStartTime(t)}
                        className={`py-2 rounded-lg border text-xs transition-colors ${
                          startTime === t
                            ? "bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] border-[var(--color-primary,#c9a876)] font-medium"
                            : "bg-[rgba(255,255,255,0.06)] border-[var(--color-border,rgba(255,255,255,0.14))] hover:bg-[rgba(255,255,255,0.12)]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Labeled label="Check in">
                      <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none" />
                    </Labeled>
                    <Labeled label="Check out">
                      <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none" />
                    </Labeled>
                  </div>
                  <Labeled label="Guests">
                    <input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none" />
                  </Labeled>
                </>
              )}
            </div>
          )}

          {step === "details" && (
            <div className="space-y-3">
              <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)]" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)]" />
              <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)]" />
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3 text-sm">
              {appointment ? (
                <>
                  <Row label={room?.name ?? "Selection"} value="1 session" />
                  <Row label="Date & time" value={`${checkIn} · ${startTime}`} />
                </>
              ) : (
                <>
                  <Row label={room?.name ?? "Selection"} value={`${nights} ${nights === 1 ? "night" : "nights"}`} />
                  <Row label="Dates" value={`${checkIn} → ${checkOut}`} />
                  <Row label="Guests" value={String(guests)} />
                </>
              )}
              <Row label="Name" value={fullName} />
              <Row label="Email" value={email} />
              <Row label="Phone" value={phone} />
              {subtotal > 0 && <Row label="Total" value={`${(room?.currency ?? "USD")} ${subtotal.toFixed(2)}`} bold />}
            </div>
          )}
        </div>

        {error && (
          <p className="mx-6 mb-3 text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <footer className="px-6 py-4 border-t border-[var(--color-border,rgba(255,255,255,0.14))] flex items-center justify-between gap-3">
          {step === "select" && (
            <button onClick={() => setStep("details")} disabled={!canProceedFromSelect} className="ml-auto inline-flex items-center gap-1 bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-colors">
              Continue <ChevronRight size={14} />
            </button>
          )}
          {step === "details" && (
            <>
              <button onClick={() => setStep("select")} className="text-sm text-[var(--color-text-secondary,rgba(244,244,245,0.65))] hover:text-[var(--color-ink,#f4f4f5)]">Back</button>
              <button onClick={() => setStep("review")} disabled={!canProceedFromDetails} className="inline-flex items-center gap-1 bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-colors">
                Continue <ChevronRight size={14} />
              </button>
            </>
          )}
          {step === "review" && (
            <>
              <button onClick={() => setStep("details")} className="text-sm text-[var(--color-text-secondary,rgba(244,244,245,0.65))] hover:text-[var(--color-ink,#f4f4f5)]">Back</button>
              <button onClick={handleConfirm} disabled={submitting} className="inline-flex items-center gap-2 bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-colors">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Booking…" : "Confirm"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Dot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span className={`h-1.5 rounded-full transition-all ${
      active ? "w-8 bg-[var(--color-primary,#c9a876)]" : done ? "w-3 bg-[var(--color-text-secondary,rgba(244,244,245,0.65))]" : "w-3 bg-[rgba(255,255,255,0.15)]"
    }`} />
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2 cursor-pointer focus-within:border-[var(--color-primary,#c9a876)] transition-colors">
      <span className="block text-[10px] uppercase tracking-widest text-[var(--color-text-secondary,rgba(244,244,245,0.65))] mb-0.5">{label}</span>
      {children}
    </label>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "pt-2 border-t border-[var(--color-border,rgba(255,255,255,0.14))] font-medium text-[var(--color-ink,#f4f4f5)]" : "text-[var(--color-text-secondary,rgba(244,244,245,0.65))]"}`}>
      <span className="text-[var(--color-text-secondary,rgba(244,244,245,0.65))]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
