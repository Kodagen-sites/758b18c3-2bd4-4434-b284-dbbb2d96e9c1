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
  if (!hasPermission(ctx.role, "rooms.edit", ctx.permissions)) throw new Error("No permission.");
  return ctx;
}

/**
 * Create N rooms of a given type (Standard King × 6 etc.)
 * One room TYPE = many resource rows sharing `type` field.
 */
export async function createRoomType(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const type        = String(fd.get("type") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const pricePerNight = Number(fd.get("pricePerNight") ?? 0);
    const amenitiesRaw = String(fd.get("amenities") ?? "").trim();
    const amenities = amenitiesRaw.split(",").map((a) => a.trim()).filter(Boolean);
    const image = String(fd.get("image") ?? "").trim();

    // Custom room numbers — one per line. Falls back to auto-numbered "Room 100..N"
    // if the field is blank or all whitespace.
    const roomNamesRaw = String(fd.get("roomNames") ?? "").trim();
    const totalRoomsFallback = Math.max(1, Math.min(50, Number(fd.get("totalRooms") ?? 1)));
    let roomNames: string[];
    if (roomNamesRaw) {
      roomNames = roomNamesRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    } else {
      roomNames = Array.from({ length: totalRoomsFallback }, (_, i) => `Room ${100 + i}`);
    }
    if (roomNames.length === 0) return { ok: false, error: "Add at least one room." };
    if (roomNames.length > 50) return { ok: false, error: "Max 50 rooms per type." };

    if (!type) return { ok: false, error: "Type name is required." };
    if (!Number.isFinite(pricePerNight) || pricePerNight < 0) return { ok: false, error: "Invalid price." };

    const supabase = await createClient();

    // De-dupe against existing room names for this type so we don't violate uniqueness.
    const { data: existing } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("name")
      .eq(FK_COL, ctx.siteId)
      .eq("type", type);
    const used = new Set((existing ?? []).map((r: any) => r.name as string).filter(Boolean));

    const fresh = roomNames.filter((n) => !used.has(n));
    if (fresh.length === 0) {
      return { ok: false, error: "All room numbers you entered already exist for this type." };
    }

    const rows = fresh.map((name, i) => ({
      site_id: ctx.siteId,
      type,
      name,
      description,
      attributes: { amenities, image },
      base_price_cents: Math.round(pricePerNight * 100),
      currency: CURRENCY_CODE,
      sort_order: i,
      active: true,
    }));

    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources").insert(rows);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/rooms");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Append a single new room (with custom name/number) to an existing type.
 */
export async function addRoomToType(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const type = String(fd.get("type") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();
    if (!type || !name) return { ok: false, error: "Type and room number are required." };

    const supabase = await createClient();

    // Pull a sample row of this type to copy description/price/attrs onto the new room.
    const { data: sample } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("description, base_price_cents, currency, attributes, sort_order")
      .eq(FK_COL, ctx.siteId)
      .eq("type", type)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sample) return { ok: false, error: "Room type not found." };

    // Reject duplicate names within the same type.
    const { data: dup } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("id")
      .eq(FK_COL, ctx.siteId)
      .eq("type", type)
      .eq("name", name)
      .maybeSingle();
    if (dup) return { ok: false, error: `Room "${name}" already exists in this type.` };

    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources").insert({
      site_id: ctx.siteId,
      type,
      name,
      description: sample.description,
      base_price_cents: sample.base_price_cents,
      currency: sample.currency,
      attributes: sample.attributes,
      sort_order: ((sample.sort_order as number | null) ?? 0) + 1,
      active: true,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/rooms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Rename one room (its name = its room number / label).
 */
export async function renameRoom(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    if (!id || !name) return { ok: false, error: "Missing id or name." };

    const supabase = await createClient();
    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .update({ name })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/rooms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Permanently delete one room. Refuses if it has live bookings.
 */
export async function deleteRoom(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { count } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
      .select("*", { count: "exact", head: true })
      .eq(FK_COL, ctx.siteId)
      .eq("resource_id", id)
      .in("state", ["pending", "confirmed", "active"]);
    if ((count ?? 0) > 0) {
      return { ok: false, error: `Can't delete — ${count} active booking(s) reference this room.` };
    }

    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .delete()
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/rooms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Update all rooms of a given type (rename, change price, amenities, image).
 */
export async function updateRoomType(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const oldType = String(fd.get("oldType") ?? "").trim();
    const type    = String(fd.get("type") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const pricePerNight = Number(fd.get("pricePerNight") ?? 0);
    const amenitiesRaw = String(fd.get("amenities") ?? "").trim();
    const amenities = amenitiesRaw.split(",").map((a) => a.trim()).filter(Boolean);
    const image = String(fd.get("image") ?? "").trim();

    if (!oldType || !type) return { ok: false, error: "Type missing." };

    const supabase = await createClient();

    // Read current attributes per row so we don't blow them away
    const { data: rows } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("id, attributes")
      .eq(FK_COL, ctx.siteId)
      .eq("type", oldType);

    const updates = (rows ?? []).map((r: any) => ({
      id: r.id,
      type,
      description,
      base_price_cents: Math.round(pricePerNight * 100),
      attributes: { ...(r.attributes as Record<string, unknown> ?? {}), amenities, image },
    }));

    for (const u of updates) {
      const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
        .update({
          type: u.type,
          description: u.description,
          base_price_cents: u.base_price_cents,
          attributes: u.attributes,
        })
        .eq("id", u.id)
        .eq(FK_COL, ctx.siteId);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin/rooms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Delete all rooms of a given type. Refuses if any active bookings reference them.
 */
export async function deleteRoomType(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const type = String(fd.get("type") ?? "").trim();
    if (!type) return { ok: false, error: "Type missing." };

    const supabase = await createClient();

    const { data: rooms } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("id")
      .eq(FK_COL, ctx.siteId)
      .eq("type", type);
    const ids = (rooms ?? []).map((r: any) => r.id as string);

    if (ids.length > 0) {
      const { count } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
        .select("*", { count: "exact", head: true })
        .eq(FK_COL, ctx.siteId)
        .in("resource_id", ids)
        .in("state", ["pending", "confirmed", "active"]);
      if ((count ?? 0) > 0) {
        return { ok: false, error: `Can't delete — ${count} active booking(s) still reference these rooms.` };
      }
    }

    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .delete()
      .eq(FK_COL, ctx.siteId)
      .eq("type", type);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/rooms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Toggle one specific room's active flag (maintenance).
 */
export async function toggleRoomActive(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const id = String(fd.get("id") ?? "");
    const active = String(fd.get("active") ?? "true") === "true";
    if (!id) return { ok: false, error: "Missing id." };

    const supabase = await createClient();
    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .update({ active })
      .eq("id", id)
      .eq(FK_COL, ctx.siteId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/rooms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
