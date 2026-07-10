"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CalendarCheck, MessageSquare, CreditCard, ShieldAlert } from "lucide-react";

type Notification = { type: string; message: string; time: string };
type NotifData = {
  total: number;
  counts: { bookings: number; inquiries: number; payments: number; scanAlerts: number };
  items: Notification[];
};

const POLL_INTERVAL = 15_000; // 15 seconds

// Notification sound — short pleasant chime using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function requestBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => {
      if (p === "granted") new Notification(title, { body, icon: "/favicon.ico" });
    });
  }
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  booking: CalendarCheck,
  inquiry: MessageSquare,
  payment: CreditCard,
  scan_alert: ShieldAlert,
};

const COLOR_MAP: Record<string, string> = {
  booking: "text-blue-500",
  inquiry: "text-pink-500",
  payment: "text-green-500",
  scan_alert: "text-red-500",
};

export default function AdminLiveUpdates() {
  const router = useRouter();
  const sinceRef = useRef<string>(new Date().toISOString());
  const [toasts, setToasts] = useState<(Notification & { id: number })[]>([]);
  const [bellCount, setBellCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [history, setHistory] = useState<Notification[]>([]);
  const nextId = useRef(0);

  const addToast = useCallback((n: Notification) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-4), { ...n, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    // Request notification permission on mount
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/notifications?since=${encodeURIComponent(sinceRef.current)}`);
        if (!res.ok) return;
        const data: NotifData & { ok: boolean } = await res.json();
        if (!data.ok || data.total === 0) return;

        // Update since to now so next poll doesn't re-fetch these
        sinceRef.current = new Date().toISOString();

        // Play sound + show toasts + browser notification
        playNotificationSound();
        setBellCount((c) => c + data.total);
        setHistory((prev) => [...data.items, ...prev].slice(0, 50));

        for (const item of data.items) {
          addToast(item);
          requestBrowserNotification(
            item.type === "booking" ? "New Booking!" :
            item.type === "payment" ? "Payment Received!" :
            item.type === "inquiry" ? "New Inquiry!" :
            "Alert",
            item.message
          );
        }

        // Auto-refresh the page to show new data
        router.refresh();
      } catch {}
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [router, addToast]);

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  return (
    <>
      {/* Bell icon — shown in the admin header */}
      <div className="relative">
        <button
          onClick={() => { setShowPanel(!showPanel); setBellCount(0); }}
          className="relative p-2 rounded-lg hover:bg-white/[0.04] transition"
        >
          <Bell className="w-5 h-5 text-gray-400" />
          {bellCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"
            >
              {bellCount > 9 ? "9+" : bellCount}
            </motion.span>
          )}
        </button>

        {/* Notification panel */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#151721] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/[0.06] z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                <button onClick={() => setShowPanel(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.04]">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">No new notifications</p>
                  </div>
                ) : (
                  history.map((n, i) => {
                    const Icon = ICON_MAP[n.type] ?? Bell;
                    const color = COLOR_MAP[n.type] ?? "text-gray-400";
                    return (
                      <div key={i} className="px-3 py-2.5 border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition">
                        <div className="flex items-start gap-2.5">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(n.time)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast notifications — bottom right */}
      <div className="fixed bottom-6 right-6 z-[200] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICON_MAP[t.type] ?? Bell;
            const color = COLOR_MAP[t.type] ?? "text-gray-400";
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="pointer-events-auto bg-white dark:bg-[#1a1d2e] rounded-xl shadow-2xl border border-gray-200 dark:border-white/[0.08] p-3 flex items-start gap-3 max-w-sm"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  t.type === "payment" ? "bg-green-500/10" :
                  t.type === "booking" ? "bg-blue-500/10" :
                  t.type === "scan_alert" ? "bg-red-500/10" :
                  "bg-pink-500/10"
                }`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{
                    t.type === "booking" ? "New Booking" :
                    t.type === "payment" ? "Payment Received" :
                    t.type === "inquiry" ? "New Message" :
                    "Alert"
                  }</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.message}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
