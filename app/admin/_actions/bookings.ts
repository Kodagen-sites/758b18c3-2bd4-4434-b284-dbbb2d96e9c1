"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { services } from "@kodagen/booking-engine";
import type { BookingState } from "@kodagen/booking-engine";
import { logAudit, hasPermission } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function bookingIdFromReference(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string, reference: string) {
  const { data, error } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("bookings")
    .select("id")
    .eq(FK_COL, siteId)
    .eq("reference", reference)
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

async function transition(reference: string, newState: BookingState, reason?: string): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  // Permission check — booking transitions need bookings.checkin
  if (!hasPermission(ctx.role, "bookings.checkin", ctx.permissions)) return { ok: false, error: "No permission." };

  const supabase = await createClient();
  const id = await bookingIdFromReference(supabase, ctx.siteId, reference);
  if (!id) return { ok: false, error: "Booking not found." };

  try {
    await services.transitionBookingState(supabase, ctx.siteId, id, newState, reason);
    logAudit({ action: `booking.${newState}`, entityType: "booking", entityId: reference, details: { newState, reason } });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function confirmBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return transition(String(fd.get("reference") ?? ""), "confirmed");
}
export async function checkInBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return transition(String(fd.get("reference") ?? ""), "active");
}
export async function checkOutBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return transition(String(fd.get("reference") ?? ""), "completed");
}
export async function cancelBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const reason = String(fd.get("reason") ?? "").trim() || "Cancelled by admin";
  return transition(String(fd.get("reference") ?? ""), "cancelled", reason);
}

/** Mark a confirmed guest who didn't show up — frees the room */
export async function markNoShow(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return transition(String(fd.get("reference") ?? ""), "no_show", "Guest did not arrive");
}

/** Reschedule a booking to new dates */
export async function rescheduleBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const reference = String(fd.get("reference") ?? "").trim();
  const newCheckIn = String(fd.get("checkIn") ?? "").trim();
  const newCheckOut = String(fd.get("checkOut") ?? "").trim();
  if (!reference || !newCheckIn || !newCheckOut) return { ok: false, error: "Missing fields." };

  const sameDay = newCheckIn === newCheckOut;
  const startISO = new Date(`${newCheckIn}T${sameDay ? "09:00:00" : "15:00:00"}`).toISOString();
  const endISO = new Date(`${newCheckOut}T${sameDay ? "23:00:00" : "11:00:00"}`).toISOString();
  if (new Date(endISO) <= new Date(startISO)) return { ok: false, error: "Check-out must be after check-in." };

  const supabase = await createClient();
  const { data: booking } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
    .select("id, resource_id, start_at, end_at, total_cents, state")
    .eq(FK_COL, ctx.siteId).eq("reference", reference).maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.state !== "pending" && booking.state !== "confirmed") {
    return { ok: false, error: `Cannot reschedule a ${booking.state} booking.` };
  }

  // Free old availability
  await withSchema(supabase, BOOKING_SCHEMA).from("availability").delete()
    .eq(FK_COL, ctx.siteId).eq("resource_id", booking.resource_id)
    .eq("start_at", booking.start_at).eq("end_at", booking.end_at);

  // Book new dates (GiST exclusion will reject if conflict)
  const { error: availErr } = await withSchema(supabase, BOOKING_SCHEMA).from("availability").insert({
    site_id: ctx.siteId, resource_id: booking.resource_id,
    start_at: startISO, end_at: endISO, status: "booked",
  });
  if (availErr) {
    // Restore old availability
    await withSchema(supabase, BOOKING_SCHEMA).from("availability").insert({
      site_id: ctx.siteId, resource_id: booking.resource_id,
      start_at: booking.start_at, end_at: booking.end_at, status: "booked",
    });
    if (/no_overlap|exclude/i.test(availErr.message)) {
      return { ok: false, error: "Room is already booked for the new dates." };
    }
    return { ok: false, error: availErr.message };
  }

  // Recalculate price
  const { data: resource } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
    .select("base_price_cents").eq("id", booking.resource_id).maybeSingle();
  const nights = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 86_400_000));
  const newTotal = (resource?.base_price_cents as number ?? 0) * nights;

  // Update booking
  await withSchema(supabase, BOOKING_SCHEMA).from("bookings").update({
    start_at: startISO, end_at: endISO,
    total_cents: newTotal, subtotal_cents: newTotal,
  }).eq("id", booking.id).eq(FK_COL, ctx.siteId);

  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Extend or shorten a stay (change checkout date only) */
export async function modifyStay(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const reference = String(fd.get("reference") ?? "").trim();
  const newCheckOut = String(fd.get("checkOut") ?? "").trim();
  if (!reference || !newCheckOut) return { ok: false, error: "Missing fields." };

  const supabase = await createClient();
  const { data: booking } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
    .select("id, resource_id, start_at, end_at, state")
    .eq(FK_COL, ctx.siteId).eq("reference", reference).maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.state !== "confirmed" && booking.state !== "active") {
    return { ok: false, error: `Cannot modify a ${booking.state} booking.` };
  }

  const endISO = new Date(`${newCheckOut}T11:00:00`).toISOString();
  if (new Date(endISO) <= new Date(booking.start_at)) return { ok: false, error: "Check-out must be after check-in." };

  // Free old availability + book new range
  await withSchema(supabase, BOOKING_SCHEMA).from("availability").delete()
    .eq(FK_COL, ctx.siteId).eq("resource_id", booking.resource_id)
    .eq("start_at", booking.start_at).eq("end_at", booking.end_at);

  const { error: availErr } = await withSchema(supabase, BOOKING_SCHEMA).from("availability").insert({
    site_id: ctx.siteId, resource_id: booking.resource_id,
    start_at: booking.start_at, end_at: endISO, status: "booked",
  });
  if (availErr) {
    await withSchema(supabase, BOOKING_SCHEMA).from("availability").insert({
      site_id: ctx.siteId, resource_id: booking.resource_id,
      start_at: booking.start_at, end_at: booking.end_at, status: "booked",
    });
    return { ok: false, error: "Room is booked by someone else for the extended dates." };
  }

  const { data: resource } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
    .select("base_price_cents").eq("id", booking.resource_id).maybeSingle();
  const nights = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(booking.start_at).getTime()) / 86_400_000));
  const newTotal = (resource?.base_price_cents as number ?? 0) * nights;

  await withSchema(supabase, BOOKING_SCHEMA).from("bookings").update({
    end_at: endISO, total_cents: newTotal, subtotal_cents: newTotal,
  }).eq("id", booking.id).eq(FK_COL, ctx.siteId);

  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Add or update internal notes on a booking */
export async function updateBookingNotes(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const reference = String(fd.get("reference") ?? "").trim();
  const notes = String(fd.get("notes") ?? "").trim();
  if (!reference) return { ok: false, error: "Missing reference." };

  const supabase = await createClient();
  const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
    .update({ internal_notes: notes || null })
    .eq(FK_COL, ctx.siteId).eq("reference", reference);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/bookings");
  return { ok: true };
}

/**
 * Move a booking to a different physical room (same type or upgrade).
 * Used at check-in time when the front desk wants to assign a specific room.
 *
 * Steps:
 *   1. Resolve booking + verify the new resource exists for this site.
 *   2. Move the availability hold from old → new (atomic: insert new row first;
 *      if the GiST exclusion blocks it the new room is taken).
 *   3. Update bookings.resource_id.
 */
export async function reassignBookingRoom(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "bookings.checkin", ctx.permissions)) return { ok: false, error: "No permission." };

  const reference = String(fd.get("reference") ?? "").trim();
  const newResourceId = String(fd.get("resourceId") ?? "").trim();
  if (!reference || !newResourceId) return { ok: false, error: "Missing booking or room." };

  const supabase = await createClient();

  const { data: booking } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("bookings")
    .select("id, resource_id, start_at, end_at, state")
    .eq(FK_COL, ctx.siteId)
    .eq("reference", reference)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking not found." };

  // No-op if it's already on this room
  if (booking.resource_id === newResourceId) return { ok: true };

  // Verify the target resource belongs to this site and is active
  const { data: target } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("resources")
    .select("id, active, name")
    .eq(FK_COL, ctx.siteId)
    .eq("id", newResourceId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Target room not found." };
  if (!target.active) return { ok: false, error: `Room ${target.name} is currently inactive.` };

  // Step 1: try to claim the new room's slot. GiST exclusion will reject if
  // another booking already holds those dates on that room.
  const { error: holdErr } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("availability")
    .insert({
      site_id: ctx.siteId,
      resource_id: newResourceId,
      start_at: booking.start_at,
      end_at: booking.end_at,
      status: "booked",
    });
  if (holdErr) {
    if (/no_overlap_reserved|exclude/i.test(holdErr.message)) {
      return { ok: false, error: `Room ${target.name} is already booked for these dates.` };
    }
    return { ok: false, error: holdErr.message };
  }

  // Step 2: free the old room's hold
  await withSchema(supabase, BOOKING_SCHEMA)
    .from("availability")
    .delete()
    .eq(FK_COL, ctx.siteId)
    .eq("resource_id", booking.resource_id)
    .eq("start_at", booking.start_at)
    .eq("end_at", booking.end_at);

  // Step 3: point the booking at the new room
  const { error: bookingErr } = await withSchema(supabase, BOOKING_SCHEMA)
    .from("bookings")
    .update({ resource_id: newResourceId })
    .eq("id", booking.id)
    .eq(FK_COL, ctx.siteId);
  if (bookingErr) return { ok: false, error: bookingErr.message };

  revalidatePath("/admin", "layout");
  return { ok: true };
}
