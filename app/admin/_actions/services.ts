"use server";
import { FK_COL, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";
import { CURRENCY_CODE } from "@/lib/currency";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Appointment services on top of the booking engine's `resources` table.
 *
 * Model: one SERVICE = one resource `type`. Capacity (how many appointments
 * can run in parallel — chairs, treatment rooms, staff) = number of resource
 * rows of that type, named "Slot 1..N". The public booking flow books a slot
 * exactly like a hotel books a room, so availability works unchanged.
 */

async function authorize() {
  const ctx = await getCurrentSite();
  if (!ctx) throw new Error("Not signed in.");
  if (!hasPermission(ctx.role, "rooms.edit", ctx.permissions)) throw new Error("No permission.");
  return ctx;
}

function readFields(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  const price = Number(fd.get("price") ?? 0);
  const durationMinutes = Math.max(0, Math.round(Number(fd.get("durationMinutes") ?? 0)));
  const capacity = Math.max(1, Math.min(50, Math.round(Number(fd.get("capacity") ?? 1))));
  const image = String(fd.get("image") ?? "").trim();
  return { name, description, price, durationMinutes, capacity, image };
}

export async function createService(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const { name, description, price, durationMinutes, capacity, image } = readFields(fd);
    if (!name) return { ok: false, error: "Service name is required." };
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Invalid price." };

    const supabase = await createClient();
    const { data: existing } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("id")
      .eq(FK_COL, ctx.siteId)
      .eq("type", name)
      .limit(1);
    if ((existing ?? []).length > 0) return { ok: false, error: "A service with that name already exists." };

    const rows = Array.from({ length: capacity }, (_, i) => ({
      site_id: ctx.siteId,
      type: name,
      name: `Slot ${i + 1}`,
      description,
      attributes: { category: "service", duration_minutes: durationMinutes, image },
      base_price_cents: Math.round(price * 100),
      currency: CURRENCY_CODE,
      sort_order: i,
      active: true,
    }));
    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources").insert(rows);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/services");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateService(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const oldName = String(fd.get("oldName") ?? "").trim();
    const { name, description, price, durationMinutes, capacity, image } = readFields(fd);
    if (!oldName || !name) return { ok: false, error: "Service name missing." };

    const supabase = await createClient();
    const { data: rows } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("id, attributes, sort_order")
      .eq(FK_COL, ctx.siteId)
      .eq("type", oldName)
      .order("sort_order", { ascending: true });
    const current = rows ?? [];
    if (current.length === 0) return { ok: false, error: "Service not found." };

    // Update shared fields on every slot, preserving unknown attributes.
    for (const r of current) {
      const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
        .update({
          type: name,
          description,
          base_price_cents: Math.round(price * 100),
          attributes: {
            ...((r.attributes as Record<string, unknown>) ?? {}),
            category: "service",
            duration_minutes: durationMinutes,
            image,
          },
        })
        .eq("id", r.id)
        .eq(FK_COL, ctx.siteId);
      if (error) return { ok: false, error: error.message };
    }

    // Grow capacity: append new slots.
    if (capacity > current.length) {
      const extra = Array.from({ length: capacity - current.length }, (_, i) => ({
        site_id: ctx.siteId,
        type: name,
        name: `Slot ${current.length + i + 1}`,
        description,
        attributes: { category: "service", duration_minutes: durationMinutes, image },
        base_price_cents: Math.round(price * 100),
        currency: CURRENCY_CODE,
        sort_order: current.length + i,
        active: true,
      }));
      const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources").insert(extra);
      if (error) return { ok: false, error: error.message };
    }

    // Shrink capacity: drop trailing slots that have no active appointments.
    if (capacity < current.length) {
      const removable = current.slice(capacity).map((r: any) => r.id as string);
      const { count } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
        .select("*", { count: "exact", head: true })
        .eq(FK_COL, ctx.siteId)
        .in("resource_id", removable)
        .in("state", ["pending", "confirmed", "active"]);
      if ((count ?? 0) > 0) {
        return { ok: false, error: `Can't reduce capacity — ${count} upcoming appointment(s) are on the slots being removed.` };
      }
      const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
        .delete()
        .eq(FK_COL, ctx.siteId)
        .in("id", removable);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin/services");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteService(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "Service name missing." };

    const supabase = await createClient();
    const { data: slots } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .select("id")
      .eq(FK_COL, ctx.siteId)
      .eq("type", name);
    const ids = (slots ?? []).map((r: any) => r.id as string);

    if (ids.length > 0) {
      const { count } = await withSchema(supabase, BOOKING_SCHEMA).from("bookings")
        .select("*", { count: "exact", head: true })
        .eq(FK_COL, ctx.siteId)
        .in("resource_id", ids)
        .in("state", ["pending", "confirmed", "active"]);
      if ((count ?? 0) > 0) {
        return { ok: false, error: `Can't delete — ${count} upcoming appointment(s) still reference this service.` };
      }
    }

    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .delete()
      .eq(FK_COL, ctx.siteId)
      .eq("type", name);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/services");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Pause/resume taking appointments for a service (toggles every slot). */
export async function toggleServiceActive(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await authorize();
    const name = String(fd.get("name") ?? "").trim();
    const active = String(fd.get("active") ?? "true") === "true";
    if (!name) return { ok: false, error: "Service name missing." };

    const supabase = await createClient();
    const { error } = await withSchema(supabase, BOOKING_SCHEMA).from("resources")
      .update({ active })
      .eq(FK_COL, ctx.siteId)
      .eq("type", name);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/services");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
