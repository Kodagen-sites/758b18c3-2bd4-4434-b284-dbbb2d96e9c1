"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Users, ChevronRight, Loader2 } from "lucide-react";
import DateRangePicker from "../forms/DateRangePicker";
import { siteConfig } from "@/content/site-config";

/**
 * BookingDrawer — premium slide-in booking experience.
 *
 * Replaces the basic full-page reservation form for V1/luxury hotel sites
 * (booking engine + hospitality industry). Slides in from the right with:
 *   - Date range picker (custom calendar, not browser default)
 *   - Room selector cards (visual, not <select> dropdown)
 *   - Guest count stepper
 *   - Live total preview that animates as inputs change
 *   - "Continue to Payment" → Paystack handoff
 *
 * Triggered from any "Reserve" / "Book now" button anywhere on the site.
 * Use the BookingDrawerProvider in App.tsx to expose the open() trigger
 * via useBookingDrawer() hook.
 *
 * This component composes existing primitives:
 *   - motion/AnimatePresence for slide
 *   - forms/DateRangePicker for dates
 *   - motion/MagneticButton for the primary CTA
 *
 * Implements production-hardening rule 33.4d (booking_pattern: drawer)
 * for hospitality + V1 voice sites.
 *
 * STYLING NOTE: every surface/text/border color uses Tailwind arbitrary
 * values with CSS-variable fallbacks (e.g. var(--color-primary,#c9a876)).
 * Generated sites define arbitrary token sets in their tailwind config —
 * a named token class that doesn't exist there silently emits NO css and
 * the panel renders transparent. Arbitrary values always compile, and the
 * hex fallbacks keep every resting surface opaque under ANY config.
 *
 * MODES: `mode="stay"` (hotel: date range × nights × guests) or
 * `mode="appointment"` (clinic/salon/spa: one date + a time slot, price
 * per session). When omitted, inferred from the inventory: if every item
 * sleeps at most 1, it's an appointment business.
 */

export type Room = {
  slug: string;
  name: string;
  description: string;
  pricePerNight: number;       // in major currency unit (e.g. 185000 for ₦185,000)
  currency: string;            // "NGN", "USD", "EUR"
  maxGuests: number;
  squareMeters?: number;
  image?: string;              // URL or placeholder gradient
  amenities?: string[];        // ["King bed", "City view", "Marble bath"]
};

export type BookingMode = "stay" | "appointment";

export type BookingDrawerProps = {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  defaultRoomSlug?: string;        // e.g. when triggered from a specific room card
  locationName?: string;            // "Eko Heritage Lagos"
  depositPercent?: number;          // 30 = 30% deposit
  paymentProvider?: "paystack" | "stripe" | "flutterwave";
  onConfirm?: (booking: BookingDraft) => Promise<void>;
  mode?: BookingMode;               // omit → inferred from rooms (all maxGuests<=1 → appointment)
  dayStart?: string;                // appointment mode: first bookable slot, "HH:mm"
  dayEnd?: string;                  // appointment mode: sessions must end by this, "HH:mm"
  slotMinutes?: number;             // appointment mode: session length
};

export type BookingDraft = {
  roomSlug: string;
  checkIn: string;       // ISO yyyy-mm-dd
  checkOut: string;      // appointment mode: equals checkIn
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  totalCents: number;
  depositCents: number;
  startTime?: string;    // appointment mode only, "HH:mm"
};

// ─── Mode + slot helpers (shared with BookingModal) ──────────────────

export function resolveBookingMode(mode: BookingMode | undefined, rooms: Room[]): BookingMode {
  if (mode) return mode;
  // All-single-occupancy inventory reads as services (clinic/salon/spa) —
  // a hotel always has at least one room sleeping 2+. Existing appointment
  // sites (all maxGuests: 1) self-correct without call-site edits.
  return rooms.length > 0 && rooms.every((r) => (r.maxGuests ?? 1) <= 1) ? "appointment" : "stay";
}

export function buildTimeSlots(dayStart = "09:00", dayEnd = "17:00", slotMinutes = 60): string[] {
  const toMin = (s: string) => {
    const [h, m] = s.split(":");
    return Number(h) * 60 + Number(m || 0);
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  const out: string[] = [];
  // Last session must END by dayEnd (17:00 close, 60min → last slot 16:00).
  for (let t = toMin(dayStart); t + slotMinutes <= toMin(dayEnd); t += slotMinutes) {
    out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return out;
}

// ─── Fullstack tenant lane (shared with the other booking variants) ──
// Fullstack tenant builds ship /api/bookings (writes booking.bookings on the
// shared DB — the row the site's admin dashboard reads). Landing/fullsite
// builds only have /api/reservations. NEXT_PUBLIC_ vars are inlined at build
// time, so this is a build-time constant and safe in client components.
export const IS_TENANT_BUILD = !!process.env.NEXT_PUBLIC_DB_MODE;

export type TenantBookingResponse = {
  ok: boolean;
  reference?: string;
  payment?: { provider?: string; authorization_url?: string };
  error?: string;
};

export async function postTenantBooking(input: {
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  specialRequests?: string;
  startTime?: string;
}): Promise<TenantBookingResponse> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: process.env.NEXT_PUBLIC_SITE_SLUG,
      specialRequests: "",
      ...input,
    }),
  });
  return res
    .json()
    .catch(() => ({ ok: false, error: `Booking failed (${res.status})` }));
}

export function cacheReservationLocally(id: string, record: Record<string, unknown>) {
  // The confirmation page reads this cache first — keeps it rendering in
  // mock mode and where the API's in-memory fallback splits across
  // serverless instances.
  try {
    window.localStorage.setItem(
      `kodagen-reservation:${id}`,
      JSON.stringify({ id, status: "placed", ...record, created_at: new Date().toISOString() }),
    );
  } catch { /* private mode */ }
}

// ─── Currency formatting helpers ─────────────────────────────────────
const SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KES: "KSh",
  ZAR: "R",
};

function fmt(amount: number, currency: string) {
  const symbol = SYMBOLS[currency] ?? currency + " ";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function BookingDrawer({
  open,
  onClose,
  rooms,
  defaultRoomSlug,
  locationName,
  depositPercent = 30,
  paymentProvider = "paystack",
  onConfirm,
  mode,
  dayStart = "09:00",
  dayEnd = "17:00",
  slotMinutes = 60,
}: BookingDrawerProps) {
  const appointment = resolveBookingMode(mode, rooms) === "appointment";

  // ─── Form state ────────────────────────────────────────────────────
  const [step, setStep] = useState<"select" | "details" | "review">("select");
  const [roomSlug, setRoomSlug] = useState(defaultRoomSlug || rooms[0]?.slug || "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [startTime, setStartTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const room = rooms.find(r => r.slug === roomSlug) ?? rooms[0];
  const nights = nightsBetween(checkIn, checkOut);
  // Appointment: flat price per session — never multiplied by nights.
  const subtotal = room ? (appointment ? room.pricePerNight : room.pricePerNight * nights) : 0;
  const deposit = Math.round(subtotal * (depositPercent / 100));
  const balance = subtotal - deposit;
  const slots = appointment ? buildTimeSlots(dayStart, dayEnd, slotMinutes) : [];

  // ─── Reset on close ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      // Don't reset immediately — wait for slide-out animation
      const t = setTimeout(() => {
        setStep("select");
        setSubmitting(false);
        setError(null);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ─── ESC key closes drawer ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ─── Lock body scroll while drawer is open ─────────────────────────
  useEffect(() => {
    if (open) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = orig; };
    }
  }, [open]);

  // ─── Validation ────────────────────────────────────────────────────
  const canProceedFromSelect = appointment
    ? Boolean(roomSlug && checkIn && startTime)
    : Boolean(roomSlug && checkIn && checkOut && nights > 0 && guests >= 1);
  const canProceedFromDetails = fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 6;

  const router = useRouter();

  // ─── Submit handler ────────────────────────────────────────────────
  // Default: POST to the /api/reservations route the skill ships, save
  // the reservation, then navigate to /booking-confirmation?id=...
  // Fullstack tenant builds: POST to /api/bookings instead (the row the
  // site admin actually sees).
  // Override: pass `onConfirm` for Paystack/Stripe deposit flows — the
  // provider-specific redirect happens inside that handler.
  const handleConfirm = async () => {
    if (!room) return;
    setSubmitting(true);
    setError(null);
    const draft: BookingDraft = {
      roomSlug,
      checkIn,
      checkOut: appointment ? checkIn : checkOut,
      guests: appointment ? 1 : guests,
      fullName,
      email,
      phone,
      totalCents: subtotal * 100,
      depositCents: deposit * 100,
      ...(appointment && startTime ? { startTime } : {}),
    };
    try {
      if (onConfirm) {
        await onConfirm(draft);
        // Provider-specific redirect happens inside onConfirm
        return;
      }
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
        if (data.payment?.authorization_url) {
          window.location.assign(data.payment.authorization_url);
          return;
        }
        const ref = data.reference ?? "";
        cacheReservationLocally(ref, draft as unknown as Record<string, unknown>);
        onClose();
        router.push(`/booking-confirmation?id=${encodeURIComponent(ref)}`);
        return;
      }
      // Default flow — no payment provider wired
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Reservation failed");
      // Cache client-side so the confirmation page works in mock mode
      // (when Supabase isn't wired yet) — the API's in-memory fallback
      // doesn't survive across serverless function instances.
      try {
        window.localStorage.setItem(
          `kodagen-reservation:${data.reservationId}`,
          JSON.stringify({
            id: data.reservationId,
            status: "placed",
            ...draft,
            created_at: new Date().toISOString(),
          }),
        );
      } catch { /* private mode — fall back to server fetch */ }
      onClose();
      router.push(`/booking-confirmation?id=${encodeURIComponent(data.reservationId)}`);
    } catch (err: any) {
      console.error("Booking failed:", err);
      setError(err?.message ?? "Could not complete the booking. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            role="dialog"
            aria-label="Booking"
            aria-modal="true"
            className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] z-50 flex flex-col bg-[var(--color-card,var(--color-bg,#141416))] text-[var(--color-ink,#f4f4f5)] shadow-2xl border-l border-[var(--color-border,rgba(255,255,255,0.14))]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-[var(--color-border,rgba(255,255,255,0.14))]">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary,#c9a876)] opacity-80">Reservation</p>
                <h2 className="font-display text-xl mt-1">
                  {locationName ?? siteConfig.company.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close booking"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 px-7 py-4 border-b border-[var(--color-border,rgba(255,255,255,0.14))] text-xs font-mono tracking-[0.15em] uppercase text-[var(--color-text-secondary,rgba(244,244,245,0.65))]">
              <StepDot active={step === "select"} done={step !== "select"} label={appointment ? "Session" : "Stay"} />
              <ChevronRight size={12} className="opacity-30" />
              <StepDot active={step === "details"} done={step === "review"} label="Details" />
              <ChevronRight size={12} className="opacity-30" />
              <StepDot active={step === "review"} done={false} label="Review" />
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
              <AnimatePresence mode="wait">
                {step === "select" && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-7"
                  >
                    {/* Date range (stay) / single date + time slots (appointment) */}
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary,#c9a876)] opacity-80 mb-3 block flex items-center gap-2">
                        <Calendar size={12} /> {appointment ? "Date & time" : "Dates"}
                      </label>
                      <DateRangePicker
                        startDate={checkIn}
                        endDate={checkOut}
                        single={appointment}
                        onChange={(start, end) => {
                          setCheckIn(start);
                          setCheckOut(end);
                        }}
                      />
                      {!appointment && nights > 0 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-[var(--color-text-secondary,rgba(244,244,245,0.65))] mt-2"
                        >
                          {nights} night{nights !== 1 ? "s" : ""}
                        </motion.p>
                      )}
                      {appointment && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {slots.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setStartTime(t)}
                              className={`py-2 rounded-lg border font-mono text-xs transition-colors ${
                                startTime === t
                                  ? "bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] border-[var(--color-primary,#c9a876)] font-medium"
                                  : "bg-[rgba(255,255,255,0.06)] border-[var(--color-border,rgba(255,255,255,0.14))] hover:bg-[rgba(255,255,255,0.12)]"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Guests — stays only; appointments are single-person sessions */}
                    {!appointment && (
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary,#c9a876)] opacity-80 mb-3 block flex items-center gap-2">
                        <Users size={12} /> Guests
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setGuests(Math.max(1, guests - 1))}
                          disabled={guests <= 1}
                          aria-label="Decrease guest count"
                          className="w-10 h-10 rounded-full border border-[var(--color-border,rgba(255,255,255,0.14))] hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="font-display text-2xl w-10 text-center">{guests}</span>
                        <button
                          onClick={() => setGuests(Math.min(room?.maxGuests ?? 4, guests + 1))}
                          disabled={!!room && guests >= room.maxGuests}
                          aria-label="Increase guest count"
                          className="w-10 h-10 rounded-full border border-[var(--color-border,rgba(255,255,255,0.14))] hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                        {room && (
                          <span className="text-xs text-[var(--color-text-secondary,rgba(244,244,245,0.65))] ml-2">
                            Sleeps up to {room.maxGuests}
                          </span>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Room / service cards */}
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary,#c9a876)] opacity-80 mb-3 block">
                        {appointment ? "Service" : "Room"}
                      </label>
                      <div className="grid gap-3">
                        {rooms.map(r => (
                          <RoomCard
                            key={r.slug}
                            room={r}
                            appointment={appointment}
                            selected={r.slug === roomSlug}
                            onSelect={() => {
                              setRoomSlug(r.slug);
                              if (guests > r.maxGuests) setGuests(r.maxGuests);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <FloatingInput
                      label="Full name"
                      value={fullName}
                      onChange={setFullName}
                      autoFocus
                    />
                    <FloatingInput
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                    />
                    <FloatingInput
                      label="Phone (with country code)"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+234 801 234 5678"
                    />
                    <p className="text-xs text-[var(--color-text-secondary,rgba(244,244,245,0.65))] leading-relaxed pt-2">
                      We use this to confirm your reservation and reach you about your {appointment ? "appointment" : "stay"}. Nothing else.
                    </p>
                  </motion.div>
                )}

                {step === "review" && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <ReviewRow label="Guest" value={fullName} />
                    <ReviewRow label="Contact" value={`${email} · ${phone}`} />
                    {appointment ? (
                      <>
                        <ReviewRow label="Date & time" value={`${formatDate(checkIn)} · ${startTime}`} />
                        <ReviewRow label="Service" value={room?.name ?? ""} />
                      </>
                    ) : (
                      <>
                        <ReviewRow label="Stay" value={`${formatDate(checkIn)} → ${formatDate(checkOut)}`} />
                        <ReviewRow label="Room" value={`${room?.name} · ${guests} guest${guests !== 1 ? "s" : ""}`} />
                        <ReviewRow label="Nights" value={String(nights)} />
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky footer with total + CTA */}
            <div className="border-t border-[var(--color-border,rgba(255,255,255,0.14))] bg-[var(--color-card,var(--color-bg,#141416))]">
              {/* Total preview */}
              <div className="px-7 py-4 space-y-1.5 text-sm">
                <Row label="Rate" value={room ? `${fmt(room.pricePerNight, room.currency)} / ${appointment ? "session" : "night"}` : "—"} muted />
                <Row label="Subtotal" value={fmt(subtotal, room?.currency ?? "USD")} muted />
                <Row
                  label={`Deposit (${depositPercent}%)`}
                  value={fmt(deposit, room?.currency ?? "USD")}
                  highlight
                />
                <Row label="Balance on arrival" value={fmt(balance, room?.currency ?? "USD")} muted small />
              </div>

              {/* Action button */}
              <div className="px-7 pb-5 pt-1">
                {error && (
                  <p className="text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] px-3 py-2 rounded-lg mb-3">
                    {error}
                  </p>
                )}
                {step === "select" && (
                  <PrimaryAction
                    onClick={() => setStep("details")}
                    disabled={!canProceedFromSelect}
                    label="Continue"
                  />
                )}
                {step === "details" && (
                  <PrimaryAction
                    onClick={() => setStep("review")}
                    disabled={!canProceedFromDetails}
                    label="Review"
                  />
                )}
                {step === "review" && (
                  <PrimaryAction
                    onClick={handleConfirm}
                    disabled={submitting}
                    loading={submitting}
                    label={`Pay deposit · ${fmt(deposit, room?.currency ?? "USD")}`}
                  />
                )}
                <p className="text-[10px] text-center text-[var(--color-text-secondary,rgba(244,244,245,0.65))] mt-2 font-mono tracking-[0.15em] uppercase">
                  Secured by {paymentProvider} · {room?.currency ?? "USD"}
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${active ? "text-[var(--color-primary,#c9a876)]" : done ? "text-[var(--color-text-secondary,rgba(244,244,245,0.65))]" : "opacity-50"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[var(--color-primary,#c9a876)]" : done ? "bg-[var(--color-text-secondary,rgba(244,244,245,0.65))]" : "bg-[var(--color-border,rgba(255,255,255,0.14))]"}`} />
      {label}
    </div>
  );
}

function RoomCard({ room, selected, onSelect, appointment }: { room: Room; selected: boolean; onSelect: () => void; appointment?: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={`group w-full text-left rounded-2xl overflow-hidden border transition-all ${
        selected
          ? "border-[var(--color-primary,#c9a876)] bg-[color-mix(in_srgb,var(--color-primary,#c9a876)_8%,transparent)] ring-1 ring-[var(--color-primary,#c9a876)]"
          : "border-[var(--color-border,rgba(255,255,255,0.14))] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* Image / placeholder */}
        <div
          className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-[color-mix(in_srgb,var(--color-primary,#c9a876)_15%,transparent)]"
          style={room.image ? { backgroundImage: `url(${room.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!room.image && (
            <div className="absolute inset-0 flex items-center justify-center font-display text-2xl text-[var(--color-primary,#c9a876)] opacity-40">
              {room.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base leading-tight">{room.name}</h3>
            <span className="font-mono text-xs text-[var(--color-primary,#c9a876)] whitespace-nowrap">
              {fmt(room.pricePerNight, room.currency)}<span className="text-[var(--color-text-secondary,rgba(244,244,245,0.65))]">{appointment ? "/session" : "/nt"}</span>
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary,rgba(244,244,245,0.65))] mt-1 line-clamp-2">{room.description}</p>
          {room.squareMeters && (
            <p className="font-mono text-[10px] text-[var(--color-text-secondary,rgba(244,244,245,0.65))] opacity-70 mt-2 tracking-wider">
              {room.squareMeters}m²{appointment ? "" : ` · sleeps ${room.maxGuests}`}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative">
      <label
        className={`absolute left-4 transition-all pointer-events-none font-mono tracking-[0.05em] ${
          lifted
            ? "top-1.5 text-[10px] uppercase text-[var(--color-primary,#c9a876)] tracking-[0.2em]"
            : "top-3.5 text-sm text-[var(--color-text-secondary,rgba(244,244,245,0.65))]"
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={lifted ? placeholder : ""}
        autoFocus={autoFocus}
        className={`w-full px-4 pt-6 pb-2 bg-[rgba(255,255,255,0.06)] border rounded-lg text-sm text-[var(--color-ink,#f4f4f5)] transition-colors outline-none ${
          focused ? "border-[var(--color-primary,#c9a876)] bg-[rgba(255,255,255,0.1)]" : "border-[var(--color-border,rgba(255,255,255,0.14))]"
        }`}
      />
    </div>
  );
}

function Row({ label, value, muted, highlight, small }: { label: string; value: string; muted?: boolean; highlight?: boolean; small?: boolean }) {
  return (
    <div className={`flex justify-between ${small ? "text-xs" : ""} ${muted ? "text-[var(--color-text-secondary,rgba(244,244,245,0.65))]" : ""} ${highlight ? "text-[var(--color-primary,#c9a876)] font-medium" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary,#c9a876)] opacity-80 mb-1">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function PrimaryAction({
  onClick,
  disabled,
  loading,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      className={`w-full py-3.5 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 ${
        disabled
          ? "bg-[rgba(255,255,255,0.08)] text-[var(--color-text-secondary,rgba(244,244,245,0.65))] opacity-60 cursor-not-allowed"
          : "bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] hover:brightness-110"
      }`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {label}
    </motion.button>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
