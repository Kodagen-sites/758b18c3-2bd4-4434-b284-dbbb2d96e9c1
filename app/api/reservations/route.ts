/**
 * /api/reservations — Next.js 16 App Router route handler.
 *
 * Drop this into app/api/reservations/route.ts.
 *
 * POST  /api/reservations          create a reservation
 * GET   /api/reservations?id=...   fetch a reservation (used by the
 *                                  booking-confirmation page)
 *
 * Persistence mirrors the orders route — three tiers, graceful degradation:
 *   1. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → writes to
 *      `customer_reservations` (SQL migration ships alongside).
 *   2. Keys absent → in-memory Map. Local dev. On serverless this can
 *      split across instances; client-side localStorage cache covers it.
 *   3. localStorage cache in BookingDrawer.tsx (after POST) + read-first
 *      in BookingConfirmation.tsx — confirmation page works regardless.
 *
 * Result: booking flow works end-to-end on a fresh deploy with zero
 * backend wiring. Connect Supabase later → persistence + admin lights up
 * with no code change.
 *
 * Restyle / rename nothing in the response shape — BookingDrawer.tsx
 * and BookingConfirmation.tsx read these exact fields.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

type ReservationDraft = {
  roomSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  totalCents: number;
  depositCents: number;
};

type StoredReservation = ReservationDraft & {
  id: string;
  status: "placed" | "confirmed" | "pending";
  created_at: string;
};

const memoryStore = new Map<string, StoredReservation>();

function getSupabaseAdmin(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function insertReservation(row: StoredReservation): Promise<void> {
  const supa = getSupabaseAdmin();
  if (!supa) {
    memoryStore.set(row.id, row);
    return;
  }
  const res = await fetch(`${supa.url}/rest/v1/customer_reservations`, {
    method: "POST",
    headers: {
      apikey: supa.key,
      Authorization: `Bearer ${supa.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: row.id,
      status: row.status,
      room_slug: row.roomSlug,
      check_in: row.checkIn,
      check_out: row.checkOut,
      guests: row.guests,
      full_name: row.fullName,
      email: row.email,
      phone: row.phone,
      total_cents: row.totalCents,
      deposit_cents: row.depositCents,
      created_at: row.created_at,
    }),
  });
  if (!res.ok) memoryStore.set(row.id, row);
}

async function fetchReservation(id: string): Promise<StoredReservation | null> {
  const supa = getSupabaseAdmin();
  if (!supa) return memoryStore.get(id) ?? null;
  const res = await fetch(
    `${supa.url}/rest/v1/customer_reservations?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      headers: { apikey: supa.key, Authorization: `Bearer ${supa.key}` },
    },
  );
  if (!res.ok) return memoryStore.get(id) ?? null;
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  if (!rows[0]) return memoryStore.get(id) ?? null;
  const r = rows[0];
  return {
    id: String(r.id),
    status: (r.status as StoredReservation["status"]) ?? "placed",
    roomSlug: String(r.room_slug ?? ""),
    checkIn: String(r.check_in ?? ""),
    checkOut: String(r.check_out ?? ""),
    guests: Number(r.guests ?? 1),
    fullName: String(r.full_name ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    totalCents: Number(r.total_cents ?? 0),
    depositCents: Number(r.deposit_cents ?? 0),
    created_at: String(r.created_at ?? new Date().toISOString()),
  };
}

export async function POST(req: Request) {
  let body: ReservationDraft;
  try {
    body = (await req.json()) as ReservationDraft;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.email || !body?.fullName) {
    return NextResponse.json({ ok: false, error: "Customer name + email required" }, { status: 400 });
  }
  if (!body?.checkIn || !body?.checkOut) {
    return NextResponse.json({ ok: false, error: "Dates required" }, { status: 400 });
  }

  const row: StoredReservation = {
    id: randomUUID(),
    status: "placed",
    created_at: new Date().toISOString(),
    ...body,
  };

  await insertReservation(row);

  return NextResponse.json({ ok: true, reservationId: row.id });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }
  const row = await fetchReservation(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Reservation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, reservation: row });
}
