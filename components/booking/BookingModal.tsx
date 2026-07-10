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
 * Submit POSTs to /api/reservations, caches client-side, routes to
 * /booking-confirmation. Same API surface as BookingDrawer.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, Loader2 } from "lucide-react";
import type { Room, BookingDraft } from "./BookingDrawer";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  defaultRoomSlug?: string;
  locationName?: string;
  onConfirm?: (booking: BookingDraft) => Promise<void>;
}

export default function BookingModal({
  open,
  onClose,
  rooms,
  defaultRoomSlug,
  locationName,
  onConfirm,
}: BookingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "details" | "review">("select");
  const [roomSlug, setRoomSlug] = useState(defaultRoomSlug ?? rooms[0]?.slug ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const room = rooms.find((r) => r.slug === roomSlug);
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86400000))
    : 0;
  const subtotal = (room?.pricePerNight ?? 0) * nights;

  // Reset to step 1 when modal opens
  useEffect(() => { if (open) { setStep("select"); setSubmitting(false); } }, [open]);

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

  const canProceedFromSelect = roomSlug && checkIn && checkOut && nights > 0 && guests >= 1;
  const canProceedFromDetails = fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 6;

  async function handleConfirm() {
    if (!room) return;
    setSubmitting(true);
    const draft: BookingDraft = {
      roomSlug, checkIn, checkOut, guests, fullName, email, phone,
      totalCents: subtotal * 100, depositCents: 0,
    };
    try {
      if (onConfirm) { await onConfirm(draft); return; }
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
    } catch (err) {
      console.error("Booking failed:", err);
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/10">
          <h2 className="text-base font-medium text-stone">
            {step === "select" ? "Book your spot" : step === "details" ? "Your details" : "Review"}
            {locationName ? <span className="text-stone/45"> · {locationName}</span> : null}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md hover:bg-stone/5">
            <X size={18} className="text-stone/60" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-stone/5">
          <Dot active={step === "select"} done={step !== "select"} />
          <Dot active={step === "details"} done={step === "review"} />
          <Dot active={step === "review"} done={false} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "select" && (
            <div className="space-y-4">
              {rooms.length > 1 && (
                <select
                  value={roomSlug}
                  onChange={(e) => setRoomSlug(e.target.value)}
                  className="w-full bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none"
                >
                  {rooms.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Check in">
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full bg-transparent text-sm text-stone outline-none" />
                </Labeled>
                <Labeled label="Check out">
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full bg-transparent text-sm text-stone outline-none" />
                </Labeled>
              </div>
              <Labeled label="Guests">
                <input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full bg-transparent text-sm text-stone outline-none" />
              </Labeled>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-3">
              <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none focus:border-stone/40" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none focus:border-stone/40" />
              <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none focus:border-stone/40" />
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3 text-sm">
              <Row label={room?.name ?? "Selection"} value={`${nights} ${nights === 1 ? "night" : "nights"}`} />
              <Row label="Dates" value={`${checkIn} → ${checkOut}`} />
              <Row label="Guests" value={String(guests)} />
              <Row label="Name" value={fullName} />
              <Row label="Email" value={email} />
              <Row label="Phone" value={phone} />
              {subtotal > 0 && <Row label="Total" value={`${(room?.currency ?? "USD")} ${subtotal.toFixed(2)}`} bold />}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-stone/10 flex items-center justify-between gap-3">
          {step === "select" && (
            <button onClick={() => setStep("details")} disabled={!canProceedFromSelect} className="ml-auto inline-flex items-center gap-1 bg-stone text-cream px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bark transition-colors">
              Continue <ChevronRight size={14} />
            </button>
          )}
          {step === "details" && (
            <>
              <button onClick={() => setStep("select")} className="text-sm text-stone/55 hover:text-stone">Back</button>
              <button onClick={() => setStep("review")} disabled={!canProceedFromDetails} className="inline-flex items-center gap-1 bg-stone text-cream px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bark transition-colors">
                Continue <ChevronRight size={14} />
              </button>
            </>
          )}
          {step === "review" && (
            <>
              <button onClick={() => setStep("details")} className="text-sm text-stone/55 hover:text-stone">Back</button>
              <button onClick={handleConfirm} disabled={submitting} className="inline-flex items-center gap-2 bg-stone text-cream px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-bark transition-colors">
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
      active ? "w-8 bg-stone" : done ? "w-3 bg-stone/60" : "w-3 bg-stone/15"
    }`} />
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block bg-stone/5 border border-stone/10 rounded-lg px-3 py-2 cursor-pointer focus-within:border-stone/40 transition-colors">
      <span className="block text-[10px] uppercase tracking-widest text-stone/50 mb-0.5">{label}</span>
      {children}
    </label>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "pt-2 border-t border-stone/10 font-medium text-stone" : "text-stone/70"}`}>
      <span className="text-stone/55">{label}</span>
      <span>{value}</span>
    </div>
  );
}
