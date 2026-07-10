"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { SiteConfig } from "@/lib/types";
import type { Booking, Inquiry } from "@/lib/admin-types";

export type DashboardData = {
  recentBookings: Booking[];
  currentGuests: Booking[];
  newInquiries: Inquiry[];
  stats: {
    totalRevenue: number;
    revenueToday: number;
    bookingsToday: number;
    pageViews: number;
    newInquiries: number;
    conversionRate: number;
  };
  charts: {
    revenue7d: number[];
    bookings7d: number[];
    pageViews7d: number[];
    inquiries7d: number[];
  };
  activityFeed: { text: string; time: string; color: string }[];
};
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import {
  CalendarCheck, Users, DollarSign, MessageSquare,
  Eye, TrendingUp, ArrowUpRight, Clock, ArrowRight,
  BedDouble, LogIn, AlertCircle, CheckCircle,
  Search, Bell, RefreshCw, Activity,
} from "lucide-react";
import Link from "next/link";
import { CURRENCY_SYMBOL } from "@/lib/currency";

// ─── Animated Number ───────────────────────────────────

function AnimNum({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    const dur = 1200;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, value]);
  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ─── SVG Line Chart ────────────────────────────────────

function LineChart({ data, color, label, height = 130 }: { data: number[]; color: string; label: string; height?: number }) {
  const max = Math.max(...data, 1);
  const min = 0; // always start Y axis from 0
  const range = max || 1;
  const w = 200;
  const h = height - 35;
  const divisor = Math.max(data.length - 1, 1);
  const points = data.map((v, i) => ({
    x: (i / divisor) * w,
    y: h - ((v - min) / range) * (h - 10) - 5,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;

  // Generate day labels from actual dates
  const today = new Date();
  const days = [0, 2, 4, 6].map((offset) => {
    const d = new Date(today); d.setDate(today.getDate() - 6 + offset);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
  });

  return (
    <div>
      <p className="text-sm font-semibold mb-4" style={{ color: color }}>{label}</p>
      <svg viewBox={`-5 0 ${w + 10} ${height}`} className="w-full overflow-visible">
        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" y1={i * (h / 3)} x2={w} y2={i * (h / 3)} stroke="currentColor" strokeOpacity="0.08" />
        ))}
        {/* Y-axis labels */}
        {[0, 1, 2, 3].map((i) => {
          const val = max - (i * max) / 3;
          const formatted = val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(Math.round(val));
          return (
            <text key={i} x="-2" y={i * (h / 3) + 3} fill="currentColor" opacity="0.35" fontSize="9" textAnchor="end">
              {formatted}
            </text>
          );
        })}
        {/* Area fill */}
        <defs>
          <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaD}
          fill={`url(#grad-${label.replace(/\s/g, "")})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        {/* Dot at end */}
        <motion.circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5 }}
        />
        {/* X-axis labels */}
        {days.map((d, i) => (
          <text key={d} x={i * (w / 3)} y={height - 5} fill="currentColor" opacity="0.35" fontSize="9" textAnchor="middle">
            {d}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Dashboard Content ─────────────────────────────────

function DashboardContent({ data }: { data: DashboardData }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const stats = data.stats;
  const recentBookings = data.recentBookings;
  const newInquiries = data.newInquiries;
  const currentGuests = data.currentGuests;

  const cardBg = dark ? "bg-[#151721]" : "bg-white";
  const cardBorder = dark ? "border-white/[0.06]" : "border-gray-200/80";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const textMuted = dark ? "text-gray-600" : "text-gray-400";

  const roomBookings = recentBookings.filter((b) => b.bookingType === "room").length;
  const eventBookings = recentBookings.filter((b) => b.bookingType === "event").length;

  const statCards = [
    { label: "Revenue Today",   value: stats.revenueToday,   prefix: CURRENCY_SYMBOL, icon: DollarSign,    trend: "Today",          color: "#22c55e" },
    { label: "Bookings Today",  value: stats.bookingsToday,                icon: CalendarCheck, trend: "Today",          color: "#3b82f6" },
    { label: "Checked In",      value: currentGuests.length,               icon: BedDouble,     trend: "Now",            color: "#a855f7" },
    { label: "Total Revenue",   value: stats.totalRevenue,   prefix: CURRENCY_SYMBOL, icon: TrendingUp,    trend: "All paid",       color: "#f59e0b" },
    { label: "New Inquiries",   value: stats.newInquiries,                  icon: MessageSquare, trend: "Unread",         color: "#ec4899" },
    { label: "Events Booked",   value: eventBookings,                       icon: Eye,           trend: "Recent",         color: "#06b6d4" },
    { label: "Conversion",      value: stats.conversionRate, suffix: "%",  icon: Activity,      trend: "—",      color: "#10b981" },
  ];

  // Only show charts that have actual data
  const allCharts = [
    { label: `Revenue (${CURRENCY_SYMBOL}) — Last 7 Days`, data: data.charts.revenue7d,   color: "#22c55e" },
    { label: "Bookings — Last 7 Days",    data: data.charts.bookings7d,  color: "#3b82f6" },
  ];
  const charts = allCharts.filter((c) => c.data.some((v) => v > 0));

  const systemHealth = [
    { name: "Website", status: "Active", ok: true },
    { name: "Booking System", status: "Active", ok: true },
    { name: "WhatsApp Chat", status: "Active", ok: true },
    { name: "Email Notifications", status: "Active", ok: true },
    { name: "Google Analytics", status: "Active", ok: true },
  ];

  const activityFeed = data.activityFeed;

  const statusDot: Record<string, { label: string; dot: string; text: string }> = {
    pending: { label: "Pending", dot: "bg-amber-400", text: dark ? "text-amber-400" : "text-amber-600" },
    confirmed: { label: "Confirmed", dot: "bg-blue-400", text: dark ? "text-blue-400" : "text-blue-600" },
    checked_in: { label: "Checked In", dot: "bg-green-400", text: dark ? "text-green-400" : "text-green-600" },
    checked_out: { label: "Checked Out", dot: "bg-gray-400", text: dark ? "text-gray-500" : "text-gray-500" },
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
          <input
            type="text"
            placeholder="Search bookings, guests, inquiries..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all ${
              dark
                ? "bg-white/[0.04] border border-white/[0.06] text-white placeholder-gray-600 focus:ring-white/10"
                : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-gray-300"
            }`}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Health badge */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${dark ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-green-50 text-green-700 border border-green-200"}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Healthy
          </div>
          <button className={`relative p-2.5 rounded-xl transition-colors ${dark ? "hover:bg-white/[0.04]" : "hover:bg-gray-100"}`}>
            <Bell className={`w-5 h-5 ${textSecondary}`} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0a0b0f]" />
          </button>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex items-center justify-between"
      >
        <h1 className={`text-xl font-bold ${textPrimary}`}>Mission Control</h1>
        <button className={`p-2 rounded-xl transition-colors ${dark ? "hover:bg-white/[0.04] text-gray-500" : "hover:bg-gray-100 text-gray-400"}`}>
          <RefreshCw className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Stat Cards — grid that wraps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3"
      >
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const isPositive = stat.trend.startsWith("+");
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className={`${cardBg} rounded-2xl border ${cardBorder} p-4 hover:border-opacity-50 transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: stat.color }}><Icon className="w-4 h-4" /></div>
                {stat.trend && (
                  <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${isPositive ? "text-green-400" : textMuted}`}>
                    {isPositive && <ArrowUpRight className="w-3 h-3" />}
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className={`text-xl font-bold ${textPrimary} mb-0.5 truncate`}>
                {stat.suffix === "%" ? (
                  <>{stat.prefix}{stat.value}{stat.suffix}</>
                ) : (
                  <AnimNum value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                )}
              </p>
              <p className={`text-[11px] ${textMuted} truncate`}>{stat.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Grid — only shows when there's actual data */}
      {charts.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`grid gap-4 ${charts.length >= 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : charts.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-lg"}`}
      >
        {charts.map((chart, i) => (
          <motion.div
            key={chart.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            className={`${cardBg} rounded-2xl border ${cardBorder} p-4 overflow-hidden`}
          >
            <LineChart data={chart.data} color={chart.color} label={chart.label} />
          </motion.div>
        ))}
      </motion.div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={`lg:col-span-3 ${cardBg} rounded-2xl border ${cardBorder} overflow-hidden`}
        >
          <div className="flex items-center justify-between p-5">
            <h2 className={`font-bold ${textPrimary}`}>Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className={`divide-y ${dark ? "divide-white/[0.04]" : "divide-gray-100"}`}>
            {recentBookings.map((b, i) => {
              const sd = statusDot[b.status] || statusDot.pending;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.04 }}
                  className={`flex items-center justify-between px-5 py-3 ${dark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"} transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}
                    >
                      {b.guestName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${textPrimary}`}>{b.guestName}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {b.bookingType === "event" ? `🎉 ${b.roomType}` : `${b.roomNumber} · ${b.roomType}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-semibold hidden sm:block ${textSecondary}`}>
                      {CURRENCY_SYMBOL}{b.totalPrice.toLocaleString()}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[11px] font-medium ${sd.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sd.dot}`} />
                      {sd.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden`}
          >
            <div className="p-5">
              <h2 className={`font-bold ${textPrimary}`}>System Health</h2>
            </div>
            <div className={`divide-y ${dark ? "divide-white/[0.04]" : "divide-gray-100"}`}>
              {systemHealth.map((item) => (
                <div key={item.name} className="flex items-center justify-between px-5 py-3">
                  <span className={`text-sm ${textSecondary}`}>{item.name}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Live Activity */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden`}
          >
            <div className="p-5">
              <h2 className={`font-bold ${textPrimary}`}>Live Activity</h2>
            </div>
            <div className="px-5 pb-5 space-y-0">
              {activityFeed.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  className="flex items-start gap-3 py-2.5"
                >
                  <div className="w-[3px] h-full min-h-[36px] rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${dark ? "text-gray-300" : "text-gray-700"}`}>{event.text}</p>
                    <p className={`text-[11px] mt-0.5 ${textMuted}`}>{event.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Room Occupancy Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className={`${cardBg} rounded-2xl border ${cardBorder} p-5`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className={`font-bold ${textPrimary}`}>Room Occupancy</h2>
            <p className={`text-xs ${textMuted} mt-0.5`}>{currentGuests.length} of 120 rooms occupied</p>
          </div>
          <span className={`text-2xl font-bold ${textPrimary}`}>
            {Math.round((currentGuests.length / 120) * 100)}%
          </span>
        </div>
        <div className={`w-full h-3 rounded-full ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentGuests.length / 120) * 100}%` }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, var(--color-accent), var(--color-primary))` }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default function DashboardView({
  data, config, counts,
}: { data: DashboardData; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <DashboardContent data={data} />
    </AdminShell>
  );
}
