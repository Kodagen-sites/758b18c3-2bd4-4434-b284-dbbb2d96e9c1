"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { Download, Printer, QrCode, BedDouble } from "lucide-react";
import type { SiteConfig } from "@/lib/types";

type Room = { id: string; name: string; type: string };

function QRCodesContent({
  rooms, origin, businessName,
}: {
  rooms: Room[];
  origin: string;
  businessName: string;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Generate QR codes for all rooms
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

  function generateAndDownload() {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Room QR Codes — ${businessName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #fff; }
  .page { page-break-after: always; padding: 40px; }
  .page:last-child { page-break-after: avoid; }
  .card {
    border: 2px solid #1a365d;
    border-radius: 20px;
    padding: 32px 28px;
    text-align: center;
    max-width: 360px;
    margin: 0 auto;
  }
  .card-header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .hotel-name {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 700;
    color: #1a365d;
  }
  .room-number {
    font-size: 36px;
    font-weight: 800;
    color: #111827;
    margin: 4px 0 2px;
    font-family: system-ui, sans-serif;
  }
  .room-type {
    font-size: 13px;
    color: #6b7280;
    font-style: italic;
  }
  .qr-container {
    margin: 20px auto;
    padding: 16px;
    background: #fafafa;
    border-radius: 16px;
    display: inline-block;
  }
  .qr-container img {
    width: 200px;
    height: 200px;
    display: block;
  }
  .scan-text {
    font-size: 16px;
    font-weight: 700;
    color: #1a365d;
    margin: 20px 0 16px;
    font-family: system-ui, sans-serif;
  }
  .instructions {
    text-align: left;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 20px;
    margin: 16px 0;
  }
  .instructions h4 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #9ca3af;
    font-weight: 700;
    margin-bottom: 10px;
    font-family: system-ui, sans-serif;
  }
  .instructions ol {
    padding-left: 20px;
    font-size: 12px;
    line-height: 1.8;
    color: #374151;
  }
  .instructions li { margin-bottom: 2px; }
  .features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 16px 0;
  }
  .feature {
    background: #f9fafb;
    border: 1px solid #f3f4f6;
    border-radius: 8px;
    padding: 10px;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
    font-family: system-ui, sans-serif;
  }
  .feature-icon { font-size: 16px; margin-bottom: 4px; }
  .footer {
    border-top: 1px solid #e5e7eb;
    padding-top: 14px;
    margin-top: 16px;
    font-size: 10px;
    color: #9ca3af;
    font-family: system-ui, sans-serif;
  }
  @media print {
    .page { padding: 20px; }
    .card { border: 2px solid #000; }
  }
</style></head><body>
${rooms.map((room) => `
<div class="page">
  <div class="card">
    <div class="card-header">
      <p class="hotel-name">${businessName}</p>
      <p class="room-number">${room.name}</p>
      <p class="room-type">${room.type}</p>
    </div>

    <div class="qr-container">
      <img src="${qrCodes[room.name] ?? ""}" alt="QR Code — ${room.name}" />
    </div>

    <p class="scan-text">📱 Scan to Connect</p>

    <div class="features">
      <div class="feature"><div class="feature-icon">📶</div>Get WiFi Password</div>
      <div class="feature"><div class="feature-icon">🕐</div>View Checkout Time</div>
      <div class="feature"><div class="feature-icon">🍽️</div>Order Room Service</div>
      <div class="feature"><div class="feature-icon">📞</div>Call Reception</div>
    </div>

    <div class="instructions">
      <h4>How to use</h4>
      <ol>
        <li>Open your phone camera</li>
        <li>Point it at the QR code above</li>
        <li>Tap the link that appears</li>
        <li>Enter your name to access all services</li>
      </ol>
    </div>

    <div class="footer">
      <p>${businessName} · ${room.name} · ${room.type}</p>
      <p>Need help? Call reception or visit the front desk.</p>
    </div>
  </div>
</div>
`).join("")}
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  }

  function downloadSingle(roomName: string) {
    const dataUrl = qrCodes[roomName];
    if (!dataUrl) return;
    // Generate a single-room card as printable HTML
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>QR — ${roomName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
  .card { border: 2px solid #1a365d; border-radius: 20px; padding: 32px 28px; text-align: center; max-width: 360px; }
  .hotel { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; color: #1a365d; }
  .room { font-size: 36px; font-weight: 800; color: #111827; margin: 4px 0 2px; font-family: system-ui; }
  .type { font-size: 13px; color: #6b7280; font-style: italic; margin-bottom: 16px; }
  img { width: 200px; height: 200px; margin: 16px auto; display: block; background: #fafafa; padding: 16px; border-radius: 16px; }
  .scan { font-size: 16px; font-weight: 700; color: #1a365d; margin: 16px 0; font-family: system-ui; }
  .hint { font-size: 11px; color: #9ca3af; line-height: 1.6; }
  @media print { .card { border: 2px solid #000; } }
</style></head><body>
<div class="card">
  <p class="hotel">${businessName}</p>
  <p class="room">${roomName}</p>
  <p class="type">${rooms.find(r => r.name === roomName)?.type ?? ""}</p>
  <img src="${dataUrl}" alt="QR" />
  <p class="scan">📱 Scan for WiFi & Services</p>
  <p class="hint">Open camera → point at QR → tap link → enter your name</p>
</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Room QR Codes</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Print and place in each room. Guests scan for WiFi, booking info, and room service.</p>
        </div>
        <button
          onClick={generateAndDownload}
          disabled={loading || rooms.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
        >
          <Download className="w-4 h-4" /> Generate & Download PDF ({rooms.length})
        </button>
      </div>

      {loading ? (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm ${s.textSecondary}`}>Generating QR codes for {rooms.length} rooms…</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
          <BedDouble className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
          <p className={`text-sm font-medium ${s.textSecondary}`}>No rooms found</p>
          <p className={`text-xs ${s.textMuted} mt-1`}>Add rooms in Room Management first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-5 text-center hover:shadow-md transition`}
            >
              {qrCodes[room.name] ? (
                <img
                  src={qrCodes[room.name]}
                  alt={`QR code for ${room.name}`}
                  className="w-40 h-40 mx-auto mb-3"
                />
              ) : (
                <div className={`w-40 h-40 mx-auto mb-3 rounded-xl ${dark ? "bg-white/[0.04]" : "bg-gray-50"} flex items-center justify-center`}>
                  <QrCode className={`w-10 h-10 ${s.textMuted}`} />
                </div>
              )}
              <p className={`text-lg font-extrabold ${s.textPrimary}`}>{room.name}</p>
              <p className={`text-xs ${s.textMuted} mb-3`}>{room.type}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => downloadSingle(room.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${s.cardBorder} ${s.hoverBg} ${s.textSecondary}`}
                >
                  <Download className="w-3 h-3" /> PNG
                </button>
              </div>
              <p className={`text-[10px] mt-3 ${s.textMuted} truncate`}>
                {origin}/room/{encodeURIComponent(room.name)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-5`}>
        <h3 className={`text-sm font-bold ${s.textPrimary} mb-2`}>How to use</h3>
        <ol className={`text-xs ${s.textSecondary} space-y-1.5 list-decimal list-inside`}>
          <li>Click <strong>"Print all"</strong> to print a sheet with all room QR codes</li>
          <li>Cut out each card and <strong>place in the room</strong> (near desk, bedside, or door)</li>
          <li>Guest scans with their phone camera → sees WiFi password, checkout time, room service menu</li>
          <li>Every scan is <strong>silently logged</strong> — the owner dashboard shows which rooms have real guests</li>
          <li>Set your WiFi password in <strong>Content → WiFi & QR</strong> tab</li>
        </ol>
      </div>
    </div>
  );
}

export default function QRCodesView({
  rooms, origin, businessName, config, counts,
}: {
  rooms: Room[];
  origin: string;
  businessName: string;
  config: SiteConfig;
  counts?: { bookings: number; inquiries: number };
}) {
  return (
    <AdminShell config={config} counts={counts}>
      <QRCodesContent rooms={rooms} origin={origin} businessName={businessName} />
    </AdminShell>
  );
}
