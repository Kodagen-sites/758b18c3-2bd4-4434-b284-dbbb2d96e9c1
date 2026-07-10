"use client";

/**
 * BookingStickyBar (variant B4) — fixed bottom-bar quick-book.
 *
 * Always-visible mini-form pinned to the bottom of the viewport. Two fields
 * (date + party size) inline, with a "Book" CTA that expands the bar into
 * a final-details overlay (name/email/phone) before POSTing.
 *
 * Best for casual venues + mobile-first audiences where pulling out a side
 * drawer feels heavy. Disappears on scroll-up past hero (optional).
 *
 * POSTs to /api/reservations (or /api/bookings on fullstack tenant builds),
 * caches client-side, routes to /booking-confirmation. Same backend
 * contract as all other variants.
 *
 * STYLING NOTE: colors are Tailwind arbitrary values with CSS-variable
 * fallbacks — named token classes missing from a generated site's tailwind
 * config silently emit NO css. The hex fallbacks keep the bar opaque and
 * readable under ANY config.
 */

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Loader2, X } from "lucide-react";
import { IS_TENANT_BUILD, postTenantBooking, cacheReservationLocally } from "./BookingDrawer";

interface BookingStickyBarProps {
  /** Optional max party size (default 12). */
  maxGuests?: number;
  /** Label on the action button. */
  cta?: string;
}

export default function BookingStickyBar({ maxGuests = 12, cta = "Book" }: BookingStickyBarProps) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [expanded, setExpanded] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide on print
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@media print { #booking-sticky-bar { display: none !important; } }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const canQuickProceed = date && guests >= 1;
  const canSubmit = canQuickProceed && fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 6;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    const draft = {
      roomSlug: "table",
      checkIn: date,
      checkOut: date,
      guests,
      fullName,
      email,
      phone,
      totalCents: 0,
      depositCents: 0,
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
    <>
      {/* Expanded overlay sheet (details step) */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <button type="button" onClick={() => setExpanded(false)} aria-label="Close" className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
          <form onSubmit={handleSubmit} className="relative bg-[var(--color-card,var(--color-bg,#141416))] text-[var(--color-ink,#f4f4f5)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button type="button" onClick={() => setExpanded(false)} aria-label="Close" className="absolute top-3 right-3 p-1 rounded-md hover:bg-[rgba(255,255,255,0.1)]">
              <X size={18} className="text-[var(--color-text-secondary,rgba(244,244,245,0.65))]" />
            </button>
            <h2 className="text-base font-medium text-[var(--color-ink,#f4f4f5)] mb-1">Confirm your booking</h2>
            <p className="text-xs text-[var(--color-text-secondary,rgba(244,244,245,0.65))] mb-5">{date} · {guests} {guests === 1 ? "guest" : "guests"}</p>
            <div className="space-y-3 mb-4">
              <input type="text" placeholder="Full name" value={fullName} required onChange={(e) => setFullName(e.target.value)} className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)]" />
              <input type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)]" />
              <input type="tel" placeholder="Phone" value={phone} required onChange={(e) => setPhone(e.target.value)} className="w-full bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ink,#f4f4f5)] outline-none focus:border-[var(--color-primary,#c9a876)]" />
            </div>
            {error && <p className="text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] px-3 py-2 rounded-lg mb-4">{error}</p>}
            <button type="submit" disabled={!canSubmit || submitting} className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] py-3 rounded-lg text-sm font-medium tracking-wide hover:brightness-110 disabled:opacity-60 transition-colors">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </form>
        </div>
      )}

      {/* The sticky bar itself — opaque: a translucent resting surface goes
          invisible when the site's tailwind config lacks the token classes. */}
      <div id="booking-sticky-bar" className="fixed bottom-0 inset-x-0 z-40 bg-[var(--color-card,var(--color-bg,#141416))] text-[var(--color-ink,#f4f4f5)] border-t border-[var(--color-border,rgba(255,255,255,0.14))] shadow-lg">
        <div className="container mx-auto px-4 py-3 max-w-5xl flex items-center gap-2 sm:gap-3">
          <label className="flex-1 min-w-0 bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2 focus-within:border-[var(--color-primary,#c9a876)] transition-colors">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--color-text-secondary,rgba(244,244,245,0.65))]">
              <Calendar size={12} /> Date
            </span>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none" />
          </label>
          <label className="bg-[rgba(255,255,255,0.06)] border border-[var(--color-border,rgba(255,255,255,0.14))] rounded-lg px-3 py-2 focus-within:border-[var(--color-primary,#c9a876)] transition-colors">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--color-text-secondary,rgba(244,244,245,0.65))]">
              <Users size={12} /> Guests
            </span>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="bg-transparent text-sm text-[var(--color-ink,#f4f4f5)] outline-none appearance-none pr-1">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={!canQuickProceed}
            className="flex-shrink-0 bg-[var(--color-primary,#c9a876)] text-[var(--color-bg,#141416)] px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium tracking-wide hover:brightness-110 disabled:opacity-50 transition-colors"
          >
            {cta}
          </button>
        </div>
      </div>
    </>
  );
}
