/**
 * Booking engine service layer — DB2 shared project variant.
 *
 * Uses the `public` schema (no .schema("booking") prefix).
 * All table names: resources, bookings, customers, availability, transactions.
 * Every function requires a service-role Supabase client (bypasses RLS).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALLOWED_TRANSITIONS,
  type Booking,
  type BookingState,
  type Resource,
  type Customer,
  type CreateBookingInput,
} from "./types";

// ─── Resources ───────────────────────────────────────────────────────────

export async function listResources(
  supabase: SupabaseClient,
  siteId: string,
  opts: { active_only?: boolean } = {},
): Promise<Resource[]> {
  let q = supabase.from("resources").select("*").eq("site_id", siteId);
  if (opts.active_only) q = q.eq("active", true);
  const { data, error } = await q.order("sort_order").order("created_at");
  if (error) throw new Error(`listResources: ${error.message}`);
  return (data ?? []) as Resource[];
}

export async function getResource(
  supabase: SupabaseClient,
  siteId: string,
  resourceId: string,
): Promise<Resource | null> {
  const { data, error } = await supabase.from("resources")
    .select("*").eq("site_id", siteId).eq("id", resourceId).maybeSingle();
  if (error) throw new Error(`getResource: ${error.message}`);
  return (data ?? null) as Resource | null;
}

// ─── Bookings ────────────────────────────────────────────────────────────

export type BookingFilters = {
  state?: BookingState | BookingState[];
  resource_id?: string;
  customer_id?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
};

export async function listBookings(
  supabase: SupabaseClient,
  siteId: string,
  filters: BookingFilters = {},
): Promise<Booking[]> {
  let q = supabase.from("bookings").select("*").eq("site_id", siteId);

  if (filters.state) {
    if (Array.isArray(filters.state)) q = q.in("state", filters.state);
    else q = q.eq("state", filters.state);
  }
  if (filters.resource_id) q = q.eq("resource_id", filters.resource_id);
  if (filters.customer_id) q = q.eq("customer_id", filters.customer_id);
  if (filters.from) q = q.gte("start_at", filters.from);
  if (filters.to) q = q.lt("start_at", filters.to);
  if (filters.search) {
    const safe = filters.search.replace(/[%,()]/g, " ").trim();
    q = q.or(`reference.ilike.%${safe}%,internal_notes.ilike.%${safe}%`);
  }
  q = q.order("start_at", { ascending: false });
  if (filters.limit) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) throw new Error(`listBookings: ${error.message}`);
  return (data ?? []) as Booking[];
}

export async function getBooking(
  supabase: SupabaseClient,
  siteId: string,
  bookingId: string,
): Promise<Booking | null> {
  const { data, error } = await supabase.from("bookings")
    .select("*").eq("site_id", siteId).eq("id", bookingId).maybeSingle();
  if (error) throw new Error(`getBooking: ${error.message}`);
  return (data ?? null) as Booking | null;
}

export async function createBooking(
  supabase: SupabaseClient,
  siteId: string,
  input: CreateBookingInput,
): Promise<Booking> {
  // 1. Upsert customer
  let customerId: string | null = null;
  if (input.customer.email || input.customer.phone) {
    const orFilters: string[] = [];
    if (input.customer.email) orFilters.push(`email.eq.${input.customer.email.toLowerCase()}`);
    if (input.customer.phone) orFilters.push(`phone.eq.${input.customer.phone}`);
    const { data: existing } = await supabase.from("customers")
      .select("id").eq("site_id", siteId).or(orFilters.join(",")).limit(1).maybeSingle();
    if (existing) {
      customerId = existing.id as string;
    } else {
      const { data: created, error } = await supabase.from("customers")
        .insert({
          site_id: siteId,
          email: input.customer.email ?? null,
          phone: input.customer.phone ?? null,
          full_name: input.customer.full_name ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`createBooking → customer: ${error.message}`);
      customerId = created.id as string;
    }
  }

  // 2. Reserve availability (GiST exclusion prevents double-booking)
  const { error: availErr } = await supabase.from("availability").insert({
    site_id: siteId,
    resource_id: input.resource_id,
    start_at: input.start_at,
    end_at: input.end_at,
    status: "booked",
  });
  if (availErr) {
    if (/no_overlap_reserved/.test(availErr.message)) {
      throw new Error("Slot already booked — please pick a different time.");
    }
    throw new Error(`createBooking → availability: ${availErr.message}`);
  }

  // 3. Create booking row
  const reference = `BKG-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase.from("bookings")
    .insert({
      site_id: siteId,
      resource_id: input.resource_id,
      customer_id: customerId,
      reference,
      start_at: input.start_at,
      end_at: input.end_at,
      state: "confirmed",
      guest_count: input.guest_count ?? 1,
      subtotal_cents: input.total_cents,
      total_cents: input.total_cents,
      currency: input.currency,
      payment_provider: input.payment_provider ?? null,
      payment_ref: input.payment_ref ?? null,
      fields: {
        ...input.fields,
        guest_name: input.customer.full_name ?? null,
        guest_email: input.customer.email ?? null,
        guest_phone: input.customer.phone ?? null,
      },
    })
    .select("*")
    .single();

  if (error) throw new Error(`createBooking: ${error.message}`);
  return data as Booking;
}

export async function transitionBookingState(
  supabase: SupabaseClient,
  siteId: string,
  bookingId: string,
  newState: BookingState,
  reason?: string,
): Promise<Booking> {
  const current = await getBooking(supabase, siteId, bookingId);
  if (!current) throw new Error("Booking not found");
  if (!ALLOWED_TRANSITIONS[current.state].includes(newState)) {
    throw new Error(`Cannot transition booking from ${current.state} → ${newState}`);
  }

  const update: Record<string, unknown> = { state: newState };
  if (newState === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    if (reason) update.cancellation_reason = reason;
    await supabase.from("availability").delete()
      .eq("site_id", siteId)
      .eq("resource_id", current.resource_id)
      .eq("start_at", current.start_at)
      .eq("end_at", current.end_at)
      .eq("status", "booked");
  }

  const { data, error } = await supabase.from("bookings")
    .update(update).eq("site_id", siteId).eq("id", bookingId).select("*").single();
  if (error) throw new Error(`transitionBookingState: ${error.message}`);
  return data as Booking;
}

// ─── Today's operations ──────────────────────────────────────────────────

export async function todayOps(supabase: SupabaseClient, siteId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [{ data: arrivals }, { data: departures }, { data: occupied }, { count: pending }] = await Promise.all([
    supabase.from("bookings").select("*")
      .eq("site_id", siteId)
      .in("state", ["confirmed", "active"])
      .gte("start_at", today.toISOString())
      .lt("start_at", tomorrow.toISOString()),
    supabase.from("bookings").select("*")
      .eq("site_id", siteId)
      .in("state", ["active", "confirmed"])
      .gte("end_at", today.toISOString())
      .lt("end_at", tomorrow.toISOString()),
    supabase.from("bookings").select("*")
      .eq("site_id", siteId)
      .eq("state", "active"),
    supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("state", "pending"),
  ]);

  return {
    arrivals: (arrivals ?? []) as Booking[],
    departures: (departures ?? []) as Booking[],
    occupied: (occupied ?? []) as Booking[],
    pending: pending ?? 0,
  };
}

// ─── Customers ───────────────────────────────────────────────────────────

export async function listCustomers(
  supabase: SupabaseClient,
  siteId: string,
  opts: { search?: string; limit?: number } = {},
): Promise<Customer[]> {
  let q = supabase.from("customers").select("*").eq("site_id", siteId);
  if (opts.search) {
    const safe = opts.search.replace(/[%,()]/g, " ").trim();
    q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  q = q.order("updated_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`listCustomers: ${error.message}`);
  return (data ?? []) as Customer[];
}
