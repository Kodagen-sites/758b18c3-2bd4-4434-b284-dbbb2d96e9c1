"use client";

/**
 * BookingInline (variant B2) — calendar-first inline booking section.
 *
 * Drops into the hero or a dedicated /reservations page. Best for sit-down
 * restaurants, casual cafés, and venues where date + party size IS the
 * hot-path choice (vs. picking a room/service first). All the picker
 * controls are visible at once — no clicks to reveal them.
 *
 * Submit POSTs to /api/reservations (or /api/bookings on fullstack tenant
 * builds), caches the reservation client-side, then routes to
 * /booking-confirmation.
 *
 * Drop into components/booking/ or directly into a section component.
 *
 * STYLING NOTE: colors are Tailwind arbitrary values with CSS-variable
 * fallbacks — named token classes missing from a generated site's tailwind
 * config silently emit NO css. The hex fallbacks keep the card opaque and
 * readable under ANY config.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Clock } from "lucide-react";
import { IS_TENANT_BUILD, postTenantBooking, cacheReservationLocally } from "./BookingDrawer";

interface BookingInlineProps {
  /** Number of available time slots (e.g. ["18:00","18:30","19:00"...]).
   *  When omitted the form shows a free-form time input. */
  timeSlots?: string[];
  /** Min party size (default 1) and max (default 12) */
  minGuests?: number;
  maxGuests?: number;
  /** Submit button label */
  cta?: string;
}

export default function BookingInline({
  timeSlots,
  minGuests = 1,
  maxGuests = 12,
  cta = "Reserve a table",
}: BookingInlineProps) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState(timeSlots?.[0] ?? "");
  const [guests, setGuests] = useState(2);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    date && time && guests >= minGuests && guests <= maxGuests &&
    fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 6;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    const draft = {
      roomSlug: "table",
      checkIn: `${date}T${time}`,
      checkOut: `${date}T${time}`,
      guests,
      fullName,
      email,
      phone,
      totalCents: 0,
      depositCents: 0,
      startTime: time,
    };
    try {
      if (IS_TENANT_BUILD) {
        const data = await postTenantBooking({
          roomType: "Table",
          checkIn: date,
          checkOut: date,
          guests,
          name: fullName,
          email,
          phone,
          startTime: time,
        });
        if (!data?.ok) throw new Error(data?.error || "Reservation failed");
        if (data.payment?.authorization_url) { window.location.assign(data.payment.authorization_url); return; }
        const ref = data.reference ?? "";
        cacheReservationLocally(ref, draft);
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
      router.push(`/booking-confirmation?id=${encodeURIComponent(data.reservationId)}`);
    } catch (err: any) {
      setError(err?.message ?? "Could not place reservation. Try again.");
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--color-card,var(--color-bg,#141416))] text-[var(--color-ink,#f4f4f5)] rounded-2xl shadow-xl border border-[var(--color-border,rgba(255,255,255,0.14))] p-6 lg:p-8 max-w-3xl mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <Field label="Date" icon={<Calendar size={16} />}>
          <input
            type="date"
            min={today}
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none"
          />
        </Field>

        <Field label="Time" icon={<Clock size={16} />}>
          {timeSlots && timeSlots.length > 0 ? (
            <select
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none appearance-none"
            >
              {timeSlots.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ) : (
            <input
              type="time"
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none"
            />
          )}
        </Field>

        <Field label="Guests" icon={<Users size={16} />}>
          <select
            value={guests}
            required
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none appearance-none"
          >
            {Array.from({ length: maxGuests - minGuests + 1 }, (_, i) => minGuests + i).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          required
          onChange={(e) => setFullName(e.target.value)}
          className="bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)] transition-colors"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)] transition-colors"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          required
          onChange={(e) => setPhone(e.target.value)}
          className="bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)] transition-colors"
        />
      </div>

      {error && (
        <p className="text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] px-3 py-2 rounded-lg mb-4">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] py-3.5 rounded-lg font-medium tracking-wide hover:brightness-110 disabled:opacity-60 transition-colors"
      >
        {submitting ? "Reserving…" : cta}
      </button>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 cursor-pointer focus-within:border-[var(--color-primary,#c9a876)] transition-colors">
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-text-secondary,rgba(244,244,245,0.65))] mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
