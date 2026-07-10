"use client";

/**
 * BookingConfirmation
 * Post-reservation thank-you page. Reads `?id={reservationId}` from URL,
 * fetches the row from /api/reservations?id=..., and shows the customer
 * a summary with the reference.
 *
 * Drop this into app/booking-confirmation/page.tsx. Restyle Tailwind to
 * match the brand voice.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Mail } from "lucide-react";

type Reservation = {
  id: string;
  status: "placed" | "confirmed" | "pending";
  roomSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  totalCents: number;
  depositCents: number;
};

export default function BookingConfirmation() {
  const params = useSearchParams();
  const reservationId = params?.get("id") ?? "";

  const [r, setR] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) {
      setError("No reservation reference provided.");
      return;
    }
    let cancelled = false;

    // localStorage cache first — works in mock mode (no Supabase) and on
    // serverless where the API's in-memory fallback splits across instances.
    // Falls through to server fetch when cache misses (e.g. emailed link).
    try {
      const cached = window.localStorage.getItem(`kodagen-reservation:${reservationId}`);
      if (cached) {
        setR(JSON.parse(cached));
        return;
      }
    } catch { /* private mode — fall through to fetch */ }

    (async () => {
      try {
        const res = await fetch(`/api/reservations?id=${encodeURIComponent(reservationId)}`);
        if (!res.ok) throw new Error("Reservation not found");
        const data = await res.json();
        if (!cancelled) setR(data.reservation ?? null);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Could not load the reservation.");
      }
    })();
    return () => { cancelled = true; };
  }, [reservationId]);

  const isPending = r?.status === "pending";

  const fmtDate = (iso: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center py-16">
      <div className="container mx-auto px-6 lg:px-12 max-w-xl text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-flax/10 flex items-center justify-center mb-8">
          {isPending ? (
            <Mail size={24} className="text-flax" />
          ) : (
            <Check size={24} className="text-flax" />
          )}
        </div>

        <h1 className="font-display font-light text-stone text-3xl lg:text-4xl mb-4">
          {isPending ? "Reservation received." : "You're booked."}
        </h1>

        <p className="text-stone/70 leading-relaxed mb-8">
          {isPending
            ? "We've recorded your request and will email you shortly with deposit instructions."
            : "A confirmation has been sent to your email. We look forward to hosting you."}
        </p>

        {reservationId && (
          <p className="text-xs uppercase tracking-widest text-stone/50 mb-6">
            Reference: <span className="text-stone tabular-nums">{reservationId.slice(0, 8).toUpperCase()}</span>
          </p>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-sm mb-6">
            {error}
          </p>
        )}

        {r && (
          <div className="bg-cream/40 rounded-sm px-6 py-5 text-left mb-8 space-y-2 text-sm">
            <Row label="Name" value={r.fullName} />
            <Row label="Check in" value={fmtDate(r.checkIn)} />
            <Row label="Check out" value={fmtDate(r.checkOut)} />
            <Row label="Guests" value={String(r.guests)} />
            {r.totalCents > 0 && (
              <Row label="Total" value={`${(r.totalCents / 100).toFixed(2)}`} />
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-block bg-stone text-cream px-8 py-3.5 rounded-sm text-sm font-medium tracking-wide hover:bg-bark transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-stone/55">{label}</span>
      <span className="text-stone font-medium">{value}</span>
    </div>
  );
}
