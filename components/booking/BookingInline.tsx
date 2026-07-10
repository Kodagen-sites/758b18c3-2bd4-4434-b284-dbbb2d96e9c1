"use client";

/**
 * BookingInline (variant B2) — calendar-first inline booking section.
 *
 * Drops into the hero or a dedicated /reservations page. Best for sit-down
 * restaurants, casual cafés, and venues where date + party size IS the
 * hot-path choice (vs. picking a room/service first). All the picker
 * controls are visible at once — no clicks to reveal them.
 *
 * Submit POSTs to /api/reservations (same endpoint as the drawer), caches
 * the reservation client-side, then routes to /booking-confirmation.
 *
 * Drop into components/booking/ or directly into a section component.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Clock } from "lucide-react";

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
    };
    try {
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
      className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-stone/10 p-6 lg:p-8 max-w-3xl mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <Field label="Date" icon={<Calendar size={16} />}>
          <input
            type="date"
            min={today}
            value={date}
            required
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent text-sm text-stone outline-none"
          />
        </Field>

        <Field label="Time" icon={<Clock size={16} />}>
          {timeSlots && timeSlots.length > 0 ? (
            <select
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent text-sm text-stone outline-none appearance-none"
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
              className="w-full bg-transparent text-sm text-stone outline-none"
            />
          )}
        </Field>

        <Field label="Guests" icon={<Users size={16} />}>
          <select
            value={guests}
            required
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-transparent text-sm text-stone outline-none appearance-none"
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
          className="bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none focus:border-stone/40 transition-colors"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          className="bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none focus:border-stone/40 transition-colors"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          required
          onChange={(e) => setPhone(e.target.value)}
          className="bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 text-sm text-stone outline-none focus:border-stone/40 transition-colors"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full bg-stone text-cream py-3.5 rounded-lg font-medium tracking-wide hover:bg-bark disabled:opacity-60 transition-colors"
      >
        {submitting ? "Reserving…" : cta}
      </button>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block bg-stone/5 border border-stone/10 rounded-lg px-3 py-2.5 cursor-pointer focus-within:border-stone/40 transition-colors">
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone/50 mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
