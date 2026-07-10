import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import { services } from "@kodagen/booking-engine";
import OccupancyView, { type RoomOccupancy } from "./occupancy-view";

export const revalidate = 0;

export default async function OccupancyPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [resources, activeBookings, confirmedBookings, { data: scans }, config, counts] = await Promise.all([
    services.listResources(supabase, ctx.siteId),
    services.listBookings(supabase, ctx.siteId, { state: "active" }),
    services.listBookings(supabase, ctx.siteId, { state: "confirmed" }),
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("room_scans")
      .select("room_number, booking_ref, matched, guest_name, scanned_at")
      .eq(FK_COL, ctx.siteId)
      .gte("scanned_at", todayISO)
      .order("scanned_at", { ascending: false }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  // Filter to rooms only (not events)
  const roomResources = resources.filter((r) => {
    const attrs = (r.attributes ?? {}) as Record<string, unknown>;
    return attrs.category !== "event";
  });

  const occupiedSet = new Set(activeBookings.map((b) => b.resource_id));
  const confirmedSet = new Set(confirmedBookings.filter((b) => {
    return new Date(b.end_at) > new Date();
  }).map((b) => b.resource_id));

  // Build scan lookup: room_number → latest scan
  const scanByRoom = new Map<string, { matched: boolean; guest_name: string; scanned_at: string; booking_ref: string | null }>();
  for (const s of scans ?? []) {
    const roomNum = s.room_number as string;
    if (!scanByRoom.has(roomNum)) {
      scanByRoom.set(roomNum, {
        matched: Boolean(s.matched),
        guest_name: (s.guest_name as string) ?? "",
        scanned_at: s.scanned_at as string,
        booking_ref: (s.booking_ref as string | null) ?? null,
      });
    }
  }

  // Count scans per room today
  const scanCountByRoom = new Map<string, number>();
  for (const s of scans ?? []) {
    const roomNum = s.room_number as string;
    scanCountByRoom.set(roomNum, (scanCountByRoom.get(roomNum) ?? 0) + 1);
  }

  const roomData: RoomOccupancy[] = roomResources.map((r) => {
    const name = (r.name ?? "") as string;
    const isOccupied = occupiedSet.has(r.id);
    const isReserved = confirmedSet.has(r.id);
    const scan = scanByRoom.get(name);
    const scanCount = scanCountByRoom.get(name) ?? 0;

    let fraudStatus: "clean" | "warning" | "alert" | "no_data" = "no_data";
    if (scan) {
      if (isOccupied && scan.matched) fraudStatus = "clean";           // booked + scan matches
      else if (!isOccupied && !isReserved && scan.matched === false) fraudStatus = "alert";  // scan but NO booking
      else if (isOccupied && !scan) fraudStatus = "warning";           // booked but no scan yet
      else fraudStatus = "clean";
    } else if (isOccupied) {
      fraudStatus = "warning"; // booked but guest hasn't scanned
    }

    return {
      id: r.id,
      name,
      type: r.type,
      hasBooking: isOccupied || isReserved,
      isCheckedIn: isOccupied,
      hasBeenScanned: !!scan,
      scanCount,
      lastScan: scan?.scanned_at ?? null,
      lastScanGuest: scan?.guest_name ?? null,
      scanMatched: scan?.matched ?? null,
      fraudStatus,
    };
  });

  // Sort: alerts first, then warnings, then rest
  const sortOrder = { alert: 0, warning: 1, no_data: 2, clean: 3 };
  roomData.sort((a, b) => sortOrder[a.fraudStatus] - sortOrder[b.fraudStatus]);

  return <OccupancyView rooms={roomData} config={config} counts={counts} />;
}
