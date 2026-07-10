"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";
import { CURRENCY_CODE } from "@/lib/currency";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function authorize() {
  const ctx = await getCurrentSite();
  if (!ctx) throw new Error("Not signed in.");
  if (!hasPermission(ctx.role, "events.edit", ctx.permissions)) throw new Error("No permission.");
  return ctx;
}

function bump() {
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
  revalidatePath("/");
}

/**
 * Create an event service (Wedding Package, Photoshoot, Birthday, etc.)
 * Stored as a booking.resource with attributes.category = "event".
 */
export async function createEvent(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const name        = String(fd.get("name") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const price       = Number(fd.get("price") ?? 0);
    const duration    = String(fd.get("duration") ?? "").trim();
    const image       = String(fd.get("image") ?? "").trim();
    const capacity    = String(fd.get("capacity") ?? "").trim();

    if (!name) return { ok: false, error: "Event name is required." };
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Invalid price." };

    const supabase = await createClient();
    const { data, error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources").insert({
      site_id: ctx.siteId,
      type: name,
      name,
      description,
      base_price_cents: Math.round(price * 100),
      currency: CURRENCY_CODE,
      sort_order: 0,
      active: true,
      attributes: {
        category: "event",
        image,
        duration,
        capacity,
      },
    }).select("id").single();
    if (error) return { ok: false, error: error.message };

    bump();
    return { ok: true, id: data?.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateEvent(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id          = String(fd.get("id") ?? "");
    const name        = String(fd.get("name") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const price       = Number(fd.get("price") ?? 0);
    const duration    = String(fd.get("duration") ?? "").trim();
    const image       = String(fd.get("image") ?? "").trim();
    const capacity    = String(fd.get("capacity") ?? "").trim();
    const active      = String(fd.get("active") ?? "true") === "true";

    if (!id) return { ok: false, error: "Missing id." };
    if (!name) return { ok: false, error: "Event name is required." };

    const supabase = await createClient();
    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources").update({
      type: name,
      name,
      description,
      base_price_cents: Math.round(price * 100),
      active,
      attributes: { category: "event", image, duration, capacity },
    }).eq("id", id).eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    bump();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteEvent(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();

    // Check for active bookings
    const { count } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
      .select("*", { count: "exact", head: true })
      .eq(FK_COL, ctx.siteId)
      .eq("resource_id", id)
      .in("state", ["pending", "confirmed", "active"]);
    if ((count ?? 0) > 0) {
      return { ok: false, error: `Can't delete — ${count} active booking(s) reference this event.` };
    }

    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .delete().eq("id", id).eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    bump();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
