"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { services } from "@kodagen/booking-engine";
import { sendEmail } from "@/lib/email/send";
import { bookingConfirmationEmail } from "@/lib/email/templates";
import { logAudit, hasPermission } from "@/lib/audit";
import { CURRENCY_CODE, CURRENCY_SYMBOL } from "@/lib/currency";

export type BookingResult = { ok: true; reference: string } | { ok: false; error: string };

/**
 * Create a booking from the admin panel (walk-in / phone reservation).
 * Skips payment — the receptionist collects cash or marks "pay later."
 */
export async function createAdminBooking(_: BookingResult | null, fd: FormData): Promise<BookingResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "bookings.create", ctx.permissions)) return { ok: false, error: "No permission." };

  const name     = String(fd.get("name") ?? "").trim();
  const email    = String(fd.get("email") ?? "").trim();
  const phone    = String(fd.get("phone") ?? "").trim();
  const roomId   = String(fd.get("roomId") ?? "").trim();
  const checkIn  = String(fd.get("checkIn") ?? "").trim();
  const checkOut = String(fd.get("checkOut") ?? "").trim();
  const guests   = Math.max(1, Math.min(20, Number(fd.get("guests") ?? 1)));
  const requests = String(fd.get("specialRequests") ?? "").trim();
  const paidNow  = String(fd.get("paidNow") ?? "false") === "true";

  if (!name) return { ok: false, error: "Guest name is required." };
  if (!roomId) return { ok: false, error: "Select a room." };
  if (!checkIn || !checkOut) return { ok: false, error: "Check-in and check-out dates are required." };

  const startISO = new Date(`${checkIn}T15:00:00`).toISOString();
  const endISO   = new Date(`${checkOut}T11:00:00`).toISOString();
  if (new Date(endISO) <= new Date(startISO)) {
    return { ok: false, error: "Check-out must be after check-in." };
  }

  const supabase = await createClient();

  // Get room details for pricing
  const { data: resource } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
    .select("id, type, name, base_price_cents, currency")
    .eq("id", roomId)
    .eq(FK_COL, ctx.siteId)
    .maybeSingle();
  if (!resource) return { ok: false, error: "Room not found." };

  const nights = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 86_400_000));
  const total_cents = (resource.base_price_cents as number) * nights;

  try {
    const booking = await services.createBooking(supabase, ctx.siteId, {
      resource_id: roomId,
      start_at: startISO,
      end_at: endISO,
      guest_count: guests,
      total_cents,
      currency: (resource.currency as string) ?? CURRENCY_CODE,
      customer: {
        full_name: name,
        email: email || undefined,
        phone: phone || undefined,
      },
      fields: {
        guest_name: name,
        guest_email: email || null,
        guest_phone: phone || null,
        special_requests: requests || null,
        source: "walk-in",
      },
    });

    // If paid at desk, record a manual transaction
    if (paidNow) {
      await withSchema(supabase, BOOKING_SCHEMA).from("transactions").insert({
        site_id: ctx.siteId,
        booking_id: booking.id,
        booking_ref: booking.reference,
        provider: "manual",
        provider_ref: `CASH-${Date.now().toString(36).toUpperCase()}`,
        amount_cents: total_cents,
        currency: resource.currency,
        status: "succeeded",
        customer_email: email || null,
        customer_name: name,
        paid_at: new Date().toISOString(),
      });
    }

    // Send confirmation email if guest has an email
    if (email) {
      const { data: siteRow } = await withSchema(supabase, KODAGEN_SCHEMA).from("sites")
        .select("name, config, theme").eq("id", ctx.siteId).maybeSingle();
      const siteCfg = (siteRow?.config ?? {}) as Record<string, unknown>;
      const thm = (siteRow?.theme ?? {}) as Record<string, unknown>;
      const tmpl = bookingConfirmationEmail({
        siteName: (siteCfg.businessName as string) || (siteRow?.name as string) || "Hotel",
        brandColor: (thm.primaryColor as string) || "#1a365d",
        guestName: name,
        reference: booking.reference,
        roomType: resource.type as string,
        roomNumber: (resource as { name?: string }).name ?? "",
        checkIn: startISO,
        checkOut: endISO,
        nights,
        guests,
        totalFormatted: `${CURRENCY_SYMBOL}${(total_cents / 100).toLocaleString()}`,
        paymentStatus: paidNow ? "paid" : "none",
        hotelAddress: ((siteCfg.contact as Record<string, unknown> | undefined)?.address as string) || "",
        hotelPhone: ((siteCfg.contact as Record<string, unknown> | undefined)?.phone as string) || "",
      });
      sendEmail(ctx.siteId, { to: email, ...tmpl }).catch((e) => console.error("[email] admin-booking:", e));
    }

    logAudit({ action: "booking.create", entityType: "booking", entityId: booking.reference, details: { guestName: name, roomId, checkIn, checkOut, paidNow, source: "walk-in" } });
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/rooms");
    revalidatePath("/admin");
    return { ok: true, reference: booking.reference };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already booked/i.test(msg)) {
      return { ok: false, error: "This room is already booked for those dates. Try a different room." };
    }
    return { ok: false, error: msg };
  }
}
