import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import { services } from "@kodagen/booking-engine";
import SecurityView, { type SecurityData } from "./security-view";

export const revalidate = 0;

export default async function SecurityPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [resources, activeBookings, confirmedBookings, { data: scans }, config, counts, h, { data: siteRow }] = await Promise.all([
    services.listResources(supabase, ctx.siteId),
    services.listBookings(supabase, ctx.siteId, { state: "active" }),
    services.listBookings(supabase, ctx.siteId, { state: "confirmed" }),
    withSchema(supabase, KODAGEN_SCHEMA).from("room_scans")
      .select("room_number, booking_ref, matched, guest_name, scanned_at")
      .eq(FK_COL, ctx.siteId)
      .gte("scanned_at", today.toISOString())
      .order("scanned_at", { ascending: false }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    headers(),
    withSchema(supabase, KODAGEN_SCHEMA).from("sites")
      .select("config").eq("id", ctx.siteId).maybeSingle(),
  ]);

  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;

  // Filter rooms only (not events)
  const roomResources = resources.filter((r) => {
    const attrs = (r.attributes ?? {}) as Record<string, unknown>;
    return attrs.category !== "event";
  });

  const occupiedSet = new Set(activeBookings.map((b) => b.resource_id));
  const confirmedSet = new Set(confirmedBookings.filter((b) => new Date(b.end_at) > new Date()).map((b) => b.resource_id));

  // Scan lookup
  const scanByRoom = new Map<string, { matched: boolean; guest_name: string; scanned_at: string }>();
  const scanCountByRoom = new Map<string, number>();
  for (const s of scans ?? []) {
    const rn = s.room_number as string;
    if (!scanByRoom.has(rn)) {
      scanByRoom.set(rn, { matched: Boolean(s.matched), guest_name: (s.guest_name as string) ?? "", scanned_at: s.scanned_at as string });
    }
    scanCountByRoom.set(rn, (scanCountByRoom.get(rn) ?? 0) + 1);
  }

  const rooms = roomResources.map((r) => {
    const name = (r.name ?? "") as string;
    const isOccupied = occupiedSet.has(r.id);
    const isReserved = confirmedSet.has(r.id);
    const scan = scanByRoom.get(name);
    const scanCount = scanCountByRoom.get(name) ?? 0;

    let fraudStatus: "clean" | "warning" | "alert" | "no_data" = "no_data";
    if (scan) {
      if (isOccupied && scan.matched) fraudStatus = "clean";
      else if (!isOccupied && !isReserved && !scan.matched) fraudStatus = "alert";
      else fraudStatus = "clean";
    } else if (isOccupied) {
      fraudStatus = "warning";
    }

    return {
      id: r.id, name, type: r.type,
      hasBooking: isOccupied || isReserved, isCheckedIn: isOccupied,
      hasBeenScanned: !!scan, scanCount,
      lastScan: scan?.scanned_at ?? null, lastScanGuest: scan?.guest_name ?? null,
      scanMatched: scan?.matched ?? null, fraudStatus,
    };
  });

  // Also flag scans for room names that DON'T exist in the resources table
  // (e.g. someone visited /room/301 but the resource is named "Room 301")
  const knownRoomNames = new Set(roomResources.map((r) => (r.name ?? "") as string));
  for (const [roomNum, scan] of scanByRoom.entries()) {
    if (!knownRoomNames.has(roomNum)) {
      // Unknown room scan — could be fraud or just a URL typo
      rooms.push({
        id: `unknown-${roomNum}`,
        name: roomNum,
        type: "Unknown room",
        hasBooking: false,
        isCheckedIn: false,
        hasBeenScanned: true,
        scanCount: scanCountByRoom.get(roomNum) ?? 1,
        lastScan: scan.scanned_at,
        lastScanGuest: scan.guest_name,
        scanMatched: false,
        fraudStatus: "alert",
      });
    }
  }

  const sortOrder = { alert: 0, warning: 1, no_data: 2, clean: 3 };
  rooms.sort((a, b) => sortOrder[a.fraudStatus] - sortOrder[b.fraudStatus]);

  // WiFi settings
  const siteCfg = (siteRow?.config ?? {}) as Record<string, unknown>;
  const wifi = (siteCfg.wifi ?? {}) as Record<string, unknown>;

  const data: SecurityData = {
    rooms,
    origin,
    businessName: config?.businessName ?? "Hotel",
    wifiName: typeof wifi.name === "string" ? wifi.name : "",
    wifiPassword: typeof wifi.password === "string" ? wifi.password : "",
    roomServiceMenu: typeof siteCfg.roomServiceMenu === "string" ? siteCfg.roomServiceMenu : "",
  };

  return <SecurityView data={data} config={config} counts={counts} />;
}
