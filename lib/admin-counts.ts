import { createClient } from "@/lib/supabase/server";
import { FK_COL, BOOKING_SCHEMA, KODAGEN_SCHEMA, withSchema } from "@/lib/db-scope";

/**
 * Live counts for the admin sidebar badges (active bookings, unread inquiries).
 * Cheap — uses count: "exact", head: true so no row data crosses the wire.
 */
export async function getSidebarCounts(siteId: string): Promise<{ bookings: number; inquiries: number }> {
  const supabase = await createClient();

  const [bookingsRes, inquiriesRes] = await Promise.all([
    withSchema(supabase, BOOKING_SCHEMA)
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq(FK_COL, siteId)
      .in("state", ["pending", "confirmed", "active"]),
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq(FK_COL, siteId)
      .eq("status", "new"),
  ]);

  return {
    bookings: bookingsRes.count ?? 0,
    inquiries: inquiriesRes.count ?? 0,
  };
}
