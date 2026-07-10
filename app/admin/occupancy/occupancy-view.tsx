"use client";

import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  Shield, ShieldAlert, ShieldCheck, ShieldQuestion,
  BedDouble, Eye, AlertTriangle, CheckCircle,
} from "lucide-react";
import type { SiteConfig } from "@/lib/types";

export type RoomOccupancy = {
  id: string;
  name: string;
  type: string;
  hasBooking: boolean;
  isCheckedIn: boolean;
  hasBeenScanned: boolean;
  scanCount: number;
  lastScan: string | null;
  lastScanGuest: string | null;
  scanMatched: boolean | null;
  fraudStatus: "clean" | "warning" | "alert" | "no_data";
};

const FRAUD_STYLES = {
  clean:   { label: "Verified",        icon: ShieldCheck,    color: "text-green-600",  bg: "bg-green-500/10",  ring: "ring-green-500/30",  dot: "bg-green-500" },
  warning: { label: "Not yet scanned", icon: ShieldQuestion, color: "text-amber-600",  bg: "bg-amber-500/10",  ring: "ring-amber-500/30",  dot: "bg-amber-500" },
  alert:   { label: "Possible fraud",  icon: ShieldAlert,    color: "text-red-600",    bg: "bg-red-500/10",    ring: "ring-red-500/30",    dot: "bg-red-500" },
  no_data: { label: "No activity",     icon: Shield,         color: "text-gray-400",   bg: "bg-gray-500/10",   ring: "ring-gray-500/20",   dot: "bg-gray-400" },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function OccupancyContent({ rooms }: { rooms: RoomOccupancy[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);

  const alerts = rooms.filter((r) => r.fraudStatus === "alert");
  const warnings = rooms.filter((r) => r.fraudStatus === "warning");
  const clean = rooms.filter((r) => r.fraudStatus === "clean");
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.hasBooking).length;
  const scanned = rooms.filter((r) => r.hasBeenScanned).length;

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div>
        <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Occupancy Verification</h1>
        <p className={`text-sm mt-1 ${s.textSecondary}`}>
          Cross-references room bookings with guest QR scans. Flags rooms where someone is present but no booking exists.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <BedDouble className="w-5 h-5 text-blue-500" />
          </div>
          <div><p className={`text-xl font-bold ${s.textPrimary}`}>{occupied}/{total}</p><p className={`text-[11px] ${s.textMuted}`}>Rooms occupied</p></div>
        </div>
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <Eye className="w-5 h-5 text-green-500" />
          </div>
          <div><p className={`text-xl font-bold ${s.textPrimary}`}>{scanned}</p><p className={`text-[11px] ${s.textMuted}`}>QR scans today</p></div>
        </div>
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div><p className={`text-xl font-bold ${s.textPrimary}`}>{clean.length}</p><p className={`text-[11px] ${s.textMuted}`}>Verified clean</p></div>
        </div>
        <div className={`${s.cardBg} rounded-2xl border ${alerts.length > 0 ? "border-red-500/30" : s.cardBorder} p-4 flex items-center gap-3 ${alerts.length > 0 ? "bg-red-500/5" : ""}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alerts.length > 0 ? "bg-red-500/15" : dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <AlertTriangle className={`w-5 h-5 ${alerts.length > 0 ? "text-red-500" : "text-gray-400"}`} />
          </div>
          <div><p className={`text-xl font-bold ${alerts.length > 0 ? "text-red-600" : s.textPrimary}`}>{alerts.length}</p><p className={`text-[11px] ${alerts.length > 0 ? "text-red-500" : s.textMuted}`}>Fraud alerts</p></div>
        </div>
      </div>

      {/* Fraud alerts — shown prominently at top */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border-2 border-red-500/30 bg-red-50 dark:bg-red-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-red-700 dark:text-red-400">⚠️ Fraud Alerts</h2>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            These rooms had a guest scan the QR code but have NO booking in the system.
            This means someone is in the room without a recorded reservation — the receptionist may have collected payment without logging it.
          </p>
          <div className="space-y-2">
            {alerts.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center font-extrabold text-sm text-red-700">
                    {r.name}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">{r.name} · {r.type}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Scanned by "{r.lastScanGuest}" at {r.lastScan ? fmtTime(r.lastScan) : "—"} — NO BOOKING FOUND
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white">INVESTIGATE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All rooms grid */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
        <div className={`p-5 border-b ${s.borderLight} flex items-center justify-between`}>
          <h2 className={`text-sm font-bold ${s.textPrimary}`}>All rooms — today's status</h2>
          <div className="flex items-center gap-3">
            {Object.entries(FRAUD_STYLES).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                <span className={`text-[11px] ${s.textMuted}`}>{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${s.borderLight}`}>
                <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Room</th>
                <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Booking</th>
                <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>QR Scan</th>
                <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Last scan</th>
                <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Status</th>
              </tr>
            </thead>
            <tbody className={s.divider}>
              {rooms.map((r) => {
                const fs = FRAUD_STYLES[r.fraudStatus];
                const Icon = fs.icon;
                return (
                  <tr key={r.id} className={`${r.fraudStatus === "alert" ? "bg-red-50/50 dark:bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs ${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textPrimary}`}>
                          {r.name}
                        </div>
                        <p className={`text-xs ${s.textMuted}`}>{r.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 ring-1 ring-green-500/30">
                          ✓ Checked in
                        </span>
                      ) : r.hasBooking ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/30">
                          Reserved
                        </span>
                      ) : (
                        <span className={`text-xs ${s.textMuted}`}>No booking</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.hasBeenScanned ? (
                        <span className="text-xs font-semibold text-green-600">{r.scanCount} scan{r.scanCount === 1 ? "" : "s"} today</span>
                      ) : (
                        <span className={`text-xs ${s.textMuted}`}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.lastScan ? (
                        <div>
                          <p className={`text-xs font-semibold ${s.textPrimary}`}>{fmtTime(r.lastScan)}</p>
                          {r.lastScanGuest && <p className={`text-[11px] ${s.textMuted}`}>by {r.lastScanGuest}</p>}
                        </div>
                      ) : (
                        <span className={`text-xs ${s.textMuted}`}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${fs.bg} ${fs.color} ring-1 ${fs.ring}`}>
                        <Icon className="w-3 h-3" />
                        {fs.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works explanation */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-5`}>
        <h3 className={`text-sm font-bold ${s.textPrimary} mb-3`}>How fraud detection works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className={`p-3 rounded-xl ${FRAUD_STYLES.clean.bg}`}>
            <p className="font-bold text-green-700 mb-1">✅ Verified</p>
            <p className="text-green-600">Room has a booking AND guest scanned the QR. Everything matches.</p>
          </div>
          <div className={`p-3 rounded-xl ${FRAUD_STYLES.warning.bg}`}>
            <p className="font-bold text-amber-700 mb-1">⚠️ Not yet scanned</p>
            <p className="text-amber-600">Room has a booking but guest hasn't scanned the QR yet. Normal if they just checked in.</p>
          </div>
          <div className={`p-3 rounded-xl ${FRAUD_STYLES.alert.bg}`}>
            <p className="font-bold text-red-700 mb-1">🚨 Possible fraud</p>
            <p className="text-red-600">Someone scanned the QR (they're in the room) but there's NO booking in the system. The receptionist may have taken cash without logging it.</p>
          </div>
          <div className={`p-3 rounded-xl ${FRAUD_STYLES.no_data.bg}`}>
            <p className="font-bold text-gray-600 mb-1">— No activity</p>
            <p className="text-gray-500">Room is available and no one has scanned today. Normal for empty rooms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OccupancyView({
  rooms, config, counts,
}: { rooms: RoomOccupancy[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <OccupancyContent rooms={rooms} />
    </AdminShell>
  );
}
