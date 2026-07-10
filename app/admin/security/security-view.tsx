"use client";

import { useState, useEffect, useActionState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  Shield, ShieldAlert, ShieldCheck, ShieldQuestion,
  BedDouble, Eye, AlertTriangle, CheckCircle,
  Download, QrCode, Wifi, Save, Lock,
} from "lucide-react";
import type { SiteConfig } from "@/lib/types";
import { saveWifi, type SaveResult } from "../_actions/site-config";

type RoomOccupancy = {
  id: string; name: string; type: string;
  hasBooking: boolean; isCheckedIn: boolean;
  hasBeenScanned: boolean; scanCount: number;
  lastScan: string | null; lastScanGuest: string | null;
  scanMatched: boolean | null;
  fraudStatus: "clean" | "warning" | "alert" | "no_data";
};

export type SecurityData = {
  rooms: RoomOccupancy[];
  origin: string;
  businessName: string;
  wifiName: string;
  wifiPassword: string;
  roomServiceMenu: string;
};

const FRAUD_STYLES = {
  clean:   { label: "Verified",        icon: ShieldCheck,    color: "text-green-600",  bg: "bg-green-500/10",  ring: "ring-green-500/30",  dot: "bg-green-500" },
  warning: { label: "Not yet scanned", icon: ShieldQuestion, color: "text-amber-600",  bg: "bg-amber-500/10",  ring: "ring-amber-500/30",  dot: "bg-amber-500" },
  alert:   { label: "Possible fraud",  icon: ShieldAlert,    color: "text-red-600",    bg: "bg-red-500/10",    ring: "ring-red-500/30",    dot: "bg-red-500" },
  no_data: { label: "No activity",     icon: Shield,         color: "text-gray-400",   bg: "bg-gray-500/10",   ring: "ring-gray-500/20",   dot: "bg-gray-400" },
};

type Tab = "occupancy" | "qr" | "settings";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function SecurityContent({ data }: { data: SecurityData }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [tab, setTab] = useState<Tab>("occupancy");

  const alerts = data.rooms.filter((r) => r.fraudStatus === "alert");
  const warnings = data.rooms.filter((r) => r.fraudStatus === "warning");
  const clean = data.rooms.filter((r) => r.fraudStatus === "clean");
  const occupied = data.rooms.filter((r) => r.hasBooking).length;
  const scanned = data.rooms.filter((r) => r.hasBeenScanned).length;

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: "occupancy", label: "Occupancy", icon: ShieldCheck, badge: alerts.length > 0 ? alerts.length : undefined },
    { id: "qr",        label: "QR Codes",  icon: QrCode },
    { id: "settings",  label: "WiFi & Menu", icon: Lock },
  ];

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div>
        <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Security & Verification</h1>
        <p className={`text-sm mt-1 ${s.textSecondary}`}>QR room concierge, occupancy verification, and fraud detection.</p>
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-1 p-1 rounded-2xl border ${s.cardBorder} ${s.cardBg}`}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`
              }`}
              style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge && (
                <span className="px-1.5 py-0 rounded-full text-[9px] font-bold bg-red-500 text-white">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Occupancy Tab ─── */}
      {tab === "occupancy" && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Rooms occupied" value={`${occupied}/${data.rooms.length}`} icon={BedDouble} color="text-blue-500" s={s} dark={dark} />
            <Kpi label="QR scans today" value={scanned} icon={Eye} color="text-green-500" s={s} dark={dark} />
            <Kpi label="Verified clean" value={clean.length} icon={CheckCircle} color="text-green-500" s={s} dark={dark} />
            <Kpi label="Fraud alerts" value={alerts.length} icon={AlertTriangle} color={alerts.length > 0 ? "text-red-500" : "text-gray-400"} s={s} dark={dark} alert={alerts.length > 0} />
          </div>

          {/* Fraud alerts */}
          {alerts.length > 0 && (
            <div className="rounded-2xl border-2 border-red-500/30 bg-red-50 dark:bg-red-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-bold text-red-700 dark:text-red-400">Fraud Alerts</h2>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                These rooms had a guest scan the QR code but have NO booking in the system. Someone is in the room without a recorded reservation.
              </p>
              {alerts.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center font-extrabold text-sm text-red-700">{r.name}</div>
                    <div>
                      <p className="text-sm font-bold text-red-800 dark:text-red-300">{r.name} · {r.type}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Scanned by "{r.lastScanGuest}" at {r.lastScan ? fmtTime(r.lastScan) : "—"} — NO BOOKING</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white">INVESTIGATE</span>
                </div>
              ))}
            </div>
          )}

          {/* Room table */}
          <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
            <div className={`p-5 border-b ${s.borderLight} flex items-center justify-between`}>
              <h2 className={`text-sm font-bold ${s.textPrimary}`}>All rooms — today</h2>
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
                    <Th s={s}>Room</Th>
                    <Th s={s}>Booking</Th>
                    <Th s={s}>QR Scan</Th>
                    <Th s={s} className="hidden sm:table-cell">Last scan</Th>
                    <Th s={s}>Status</Th>
                  </tr>
                </thead>
                <tbody className={s.divider}>
                  {data.rooms.map((r) => {
                    const fs = FRAUD_STYLES[r.fraudStatus];
                    const Icon = fs.icon;
                    return (
                      <tr key={r.id} className={r.fraudStatus === "alert" ? "bg-red-50/50 dark:bg-red-500/5" : ""}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs ${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textPrimary}`}>{r.name}</div>
                            <p className={`text-xs ${s.textMuted}`}>{r.type}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.isCheckedIn ? <Badge cls="bg-green-500/10 text-green-600 ring-green-500/30">✓ Checked in</Badge>
                           : r.hasBooking ? <Badge cls="bg-blue-500/10 text-blue-600 ring-blue-500/30">Reserved</Badge>
                           : <span className={`text-xs ${s.textMuted}`}>No booking</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {r.hasBeenScanned ? <span className="text-xs font-semibold text-green-600">{r.scanCount} scan{r.scanCount === 1 ? "" : "s"}</span>
                           : <span className={`text-xs ${s.textMuted}`}>—</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          {r.lastScan ? <><p className={`text-xs font-semibold ${s.textPrimary}`}>{fmtTime(r.lastScan)}</p>{r.lastScanGuest && <p className={`text-[11px] ${s.textMuted}`}>by {r.lastScanGuest}</p>}</>
                           : <span className={`text-xs ${s.textMuted}`}>—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${fs.bg} ${fs.color} ring-1 ${fs.ring}`}>
                            <Icon className="w-3 h-3" />{fs.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── QR Codes Tab ─── */}
      {tab === "qr" && <QRCodesTab rooms={data.rooms} origin={data.origin} businessName={data.businessName} s={s} dark={dark} />}

      {/* ─── Settings Tab ─── */}
      {tab === "settings" && <SettingsTab data={data} s={s} dark={dark} />}
    </div>
  );
}

// ─── QR Codes tab ─────────────────────────────────────

function QRCodesTab({ rooms, origin, businessName, s, dark }: {
  rooms: RoomOccupancy[]; origin: string; businessName: string;
  s: ReturnType<typeof getAdminStyles>; dark: boolean;
}) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all(
      rooms.map(async (room) => {
        const url = `${origin}/room/${encodeURIComponent(room.name)}`;
        const res = await fetch(`/api/qr?text=${encodeURIComponent(url)}&size=400`);
        const data = await res.json();
        return { name: room.name, dataUrl: data.ok ? data.dataUrl : "" };
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const r of results) map[r.name] = r.dataUrl;
      setQrCodes(map);
      setLoading(false);
    });
  }, [rooms, origin]);

  function generatePDF() {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Room QR Codes — ${businessName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#fff}
.page{page-break-after:always;padding:40px}.page:last-child{page-break-after:avoid}
.card{border:2px solid #1a365d;border-radius:20px;padding:32px 28px;text-align:center;max-width:360px;margin:0 auto}
.hotel{font-size:13px;text-transform:uppercase;letter-spacing:3px;font-weight:700;color:#1a365d}
.room{font-size:36px;font-weight:800;color:#111827;margin:4px 0 2px;font-family:system-ui}
.type{font-size:13px;color:#6b7280;font-style:italic}
.qr{margin:20px auto;padding:16px;background:#fafafa;border-radius:16px;display:inline-block}
.qr img{width:200px;height:200px;display:block}
.scan{font-size:16px;font-weight:700;color:#1a365d;margin:20px 0 16px;font-family:system-ui}
.features{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}
.feature{background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;padding:10px;font-size:11px;font-weight:600;color:#374151;font-family:system-ui}
.fi{font-size:16px;margin-bottom:4px}
.inst{text-align:left;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin:16px 0}
.inst h4{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;font-weight:700;margin-bottom:10px;font-family:system-ui}
.inst ol{padding-left:20px;font-size:12px;line-height:1.8;color:#374151}
.foot{border-top:1px solid #e5e7eb;padding-top:14px;margin-top:16px;font-size:10px;color:#9ca3af;font-family:system-ui}
@media print{.page{padding:20px}.card{border:2px solid #000}}</style></head><body>
${rooms.map((room) => `<div class="page"><div class="card">
<p class="hotel">${businessName}</p><p class="room">${room.name}</p><p class="type">${room.type}</p>
<div class="qr"><img src="${qrCodes[room.name] ?? ""}" alt="QR"/></div>
<p class="scan">📱 Scan to Connect</p>
<div class="features"><div class="feature"><div class="fi">📶</div>Get WiFi Password</div><div class="feature"><div class="fi">🕐</div>View Checkout Time</div><div class="feature"><div class="fi">🍽️</div>Order Room Service</div><div class="feature"><div class="fi">📞</div>Call Reception</div></div>
<div class="inst"><h4>How to use</h4><ol><li>Open your phone camera</li><li>Point it at the QR code above</li><li>Tap the link that appears</li><li>Enter your name to access all services</li></ol></div>
<div class="foot"><p>${businessName} · ${room.name} · ${room.type}</p><p>Need help? Call reception or visit the front desk.</p></div>
</div></div>`).join("")}</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-sm ${s.textSecondary}`}>One QR card per room with guest instructions. Print and place in each room.</p>
        <button onClick={generatePDF} disabled={loading || rooms.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
          <Download className="w-4 h-4" /> Generate & Download PDF ({rooms.length})
        </button>
      </div>

      {loading ? (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm ${s.textSecondary}`}>Generating QR codes…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-5 text-center hover:shadow-md transition`}>
              {qrCodes[room.name] ? (
                <img src={qrCodes[room.name]} alt={`QR ${room.name}`} className="w-36 h-36 mx-auto mb-3" />
              ) : (
                <div className={`w-36 h-36 mx-auto mb-3 rounded-xl ${dark ? "bg-white/[0.04]" : "bg-gray-50"} flex items-center justify-center`}>
                  <QrCode className={`w-10 h-10 ${s.textMuted}`} />
                </div>
              )}
              <p className={`text-lg font-extrabold ${s.textPrimary}`}>{room.name}</p>
              <p className={`text-xs ${s.textMuted}`}>{room.type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────

function SettingsTab({ data, s, dark }: { data: SecurityData; s: ReturnType<typeof getAdminStyles>; dark: boolean }) {
  const [wifiState, wifiAction, wifiPending] = useActionState<SaveResult | null, FormData>(saveWifi, null);
  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 transition ${s.inputBg} ${s.inputRing}`;

  return (
    <form action={wifiAction} className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-6 space-y-4 max-w-xl`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[var(--color-accent)]" />
          <h2 className={`text-base font-bold ${s.textPrimary}`}>WiFi & Room Service</h2>
        </div>
        {wifiState?.ok && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600">✓ Saved</span>
        )}
      </div>
      <p className={`text-xs ${s.textMuted}`}>
        These settings are shown to guests when they scan the QR code in their room. Only you (the owner) can see and change them here.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>WiFi network name</label>
          <input name="wifiName" defaultValue={data.wifiName} className={inputCls} placeholder="GrandRoyale_Guest" />
        </div>
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>WiFi password</label>
          <input name="wifiPassword" defaultValue={data.wifiPassword} className={inputCls} placeholder="Welcome2026!" />
        </div>
      </div>
      <div>
        <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Room service menu link</label>
        <input name="roomServiceMenu" defaultValue={data.roomServiceMenu} className={inputCls} placeholder="https://… or leave blank" />
        <p className={`text-[11px] mt-1.5 ${s.textMuted}`}>Guests see a "Room service" button linking here.</p>
      </div>
      {wifiState && !wifiState.ok && (
        <p className="text-xs text-red-600 px-3 py-2 rounded-lg bg-red-50 border border-red-200">{wifiState.error}</p>
      )}
      <button type="submit" disabled={wifiPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition hover:scale-[1.02] disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
        <Save className="w-4 h-4" /> {wifiPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────

function Th({ children, s, className = "" }: { children: React.ReactNode; s: ReturnType<typeof getAdminStyles>; className?: string }) {
  return <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted} ${className}`}>{children}</th>;
}
function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${cls}`}>{children}</span>;
}
function Kpi({ label, value, icon: Icon, color, s, dark, alert }: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string;
  s: ReturnType<typeof getAdminStyles>; dark: boolean; alert?: boolean;
}) {
  return (
    <div className={`${s.cardBg} rounded-2xl border ${alert ? "border-red-500/30 bg-red-500/5" : s.cardBorder} p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert ? "bg-red-500/15" : dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
        <div className={color}><Icon className="w-5 h-5" /></div>
      </div>
      <div><p className={`text-xl font-bold ${alert ? "text-red-600" : s.textPrimary}`}>{value}</p><p className={`text-[11px] ${alert ? "text-red-500" : s.textMuted}`}>{label}</p></div>
    </div>
  );
}

export default function SecurityView({
  data, config, counts,
}: { data: SecurityData; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <SecurityContent data={data} />
    </AdminShell>
  );
}
