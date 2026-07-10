"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  TrendingUp, Wallet, RotateCcw, CheckCircle, Download, BarChart3, Receipt,
} from "lucide-react";
import type { SiteConfig } from "@/lib/types";
import { CURRENCY_CODE } from "@/lib/currency";

export type ReportTransaction = {
  provider: "paystack" | "stripe" | "manual";
  amount: number;
  fee: number;
  net: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  at: string;
};

const RANGES = [
  { id: "7",   label: "7 days" },
  { id: "30",  label: "30 days" },
  { id: "90",  label: "90 days" },
  { id: "365", label: "1 year" },
] as const;
type RangeId = typeof RANGES[number]["id"];

const PROVIDER_STYLE: Record<string, { label: string; color: string }> = {
  paystack: { label: "Paystack", color: "#0BA4DB" },
  stripe:   { label: "Stripe",   color: "#635BFF" },
  manual:   { label: "Manual",   color: "#6B7280" },
};

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function ReportsContent({ transactions }: { transactions: ReportTransaction[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [range, setRange] = useState<RangeId>("30");

  // Filter into the active window
  const since = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - parseInt(range, 10) + 1);
    return d;
  }, [range]);

  const inRange = useMemo(
    () => transactions.filter((t) => new Date(t.at) >= since),
    [transactions, since],
  );

  // Aggregates
  const succeeded = inRange.filter((t) => t.status === "succeeded");
  const refunded  = inRange.filter((t) => t.status === "refunded");
  const failed    = inRange.filter((t) => t.status === "failed");

  const totalGross = succeeded.reduce((s, t) => s + t.amount, 0);
  const totalFees  = succeeded.reduce((s, t) => s + t.fee, 0);
  const totalNet   = succeeded.reduce((s, t) => s + t.net, 0);
  const totalRefunds = refunded.reduce((s, t) => s + t.amount, 0);
  const baseCurrency = succeeded[0]?.currency ?? inRange[0]?.currency ?? CURRENCY_CODE;

  // Daily series for the chart
  const dailySeries = useMemo(() => {
    const days = parseInt(range, 10);
    const series: { date: Date; gross: number; net: number; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      series.push({ date: d, gross: 0, net: 0, count: 0 });
    }
    for (const t of succeeded) {
      const d = new Date(t.at); d.setHours(0, 0, 0, 0);
      const idx = series.findIndex((p) => p.date.getTime() === d.getTime());
      if (idx >= 0) {
        series[idx].gross += t.amount;
        series[idx].net   += t.net;
        series[idx].count += 1;
      }
    }
    return series;
  }, [succeeded, range]);

  const maxBar = Math.max(1, ...dailySeries.map((d) => d.gross));

  // Provider breakdown
  const byProvider = useMemo(() => {
    const map: Record<string, { gross: number; fees: number; net: number; count: number }> = {};
    for (const t of succeeded) {
      const p = t.provider;
      if (!map[p]) map[p] = { gross: 0, fees: 0, net: 0, count: 0 };
      map[p].gross += t.amount;
      map[p].fees  += t.fee;
      map[p].net   += t.net;
      map[p].count += 1;
    }
    return Object.entries(map).map(([provider, v]) => ({ provider, ...v }))
      .sort((a, b) => b.gross - a.gross);
  }, [succeeded]);

  function exportCsv() {
    const header = ["date", "time", "provider", "status", "amount", "fee", "net", "currency"];
    const rows = inRange.map((t) => {
      const d = new Date(t.at);
      return [
        d.toLocaleDateString("en-CA"),
        d.toLocaleTimeString("en-GB", { hour12: false }),
        t.provider, t.status,
        t.amount.toFixed(2), t.fee.toFixed(2), t.net.toFixed(2),
        t.currency,
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${range}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Reports</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Revenue, fees, refunds and provider breakdown over time.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`inline-flex items-center gap-0.5 p-1 rounded-xl border ${s.cardBorder} ${s.cardBg}`}>
            {RANGES.map((r) => {
              const active = range === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`}`}
                  style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={exportCsv}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${s.cardBorder} ${s.hoverBg} ${s.textSecondary}`}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Gross revenue"  value={fmtMoney(totalGross, baseCurrency)}   icon={Wallet}      color="text-green-500"  hint={`${succeeded.length} payment${succeeded.length === 1 ? "" : "s"}`} s={s} dark={dark} />
        <Kpi label="Gateway fees"   value={fmtMoney(totalFees, baseCurrency)}    icon={TrendingUp}  color="text-amber-500"  hint={`${baseCurrency} – Paystack reports fees`} s={s} dark={dark} />
        <Kpi label="Net to bank"    value={fmtMoney(totalNet, baseCurrency)}     icon={CheckCircle} color="text-blue-500"   hint="Gross minus gateway fees" s={s} dark={dark} />
        <Kpi label="Refunded"       value={fmtMoney(totalRefunds, baseCurrency)} icon={RotateCcw}   color="text-purple-500" hint={`${refunded.length} refund${refunded.length === 1 ? "" : "s"}`} s={s} dark={dark} />
      </div>

      {/* Bar chart */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className={`w-4 h-4 ${s.textMuted}`} />
            <h2 className={`text-sm font-bold ${s.textPrimary}`}>Daily revenue</h2>
          </div>
          <p className={`text-[11px] ${s.textMuted}`}>{succeeded.length} successful payments · {failed.length} failed</p>
        </div>
        {succeeded.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
            <p className={`text-sm ${s.textSecondary}`}>No revenue in the selected window yet.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-44">
              {dailySeries.map((d, i) => {
                const h = (d.gross / maxBar) * 100;
                return (
                  <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1 group">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: i * 0.01, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full rounded-t-md relative cursor-pointer"
                      style={{ background: `linear-gradient(180deg, var(--color-accent), var(--color-primary))`, minHeight: d.gross > 0 ? 4 : 0 }}
                    >
                      {/* Tooltip on hover */}
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none ${dark ? "bg-white text-gray-900" : "bg-gray-900 text-white"}`}>
                        {fmtMoney(d.gross, baseCurrency)} · {d.count}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-semibold uppercase tracking-wider">
              <span className={s.textMuted}>{dailySeries[0]?.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              <span className={s.textMuted}>{dailySeries[dailySeries.length - 1]?.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </div>
          </>
        )}
      </div>

      {/* Provider breakdown */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
        <div className={`p-5 border-b ${s.borderLight}`}>
          <h2 className={`text-sm font-bold ${s.textPrimary}`}>Breakdown by provider</h2>
        </div>
        {byProvider.length === 0 ? (
          <div className="p-10 text-center">
            <p className={`text-sm ${s.textMuted}`}>No completed payments in this window.</p>
          </div>
        ) : (
          <div className={s.divider}>
            {byProvider.map((row) => {
              const provider = PROVIDER_STYLE[row.provider] ?? PROVIDER_STYLE.manual;
              const share = totalGross > 0 ? (row.gross / totalGross) * 100 : 0;
              return (
                <div key={row.provider} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provider.color }} />
                      <p className={`font-bold text-sm ${s.textPrimary}`}>{provider.label}</p>
                      <span className={`text-[11px] ${s.textMuted}`}>· {row.count} payment{row.count === 1 ? "" : "s"}</span>
                    </div>
                    <p className={`text-sm font-bold ${s.textPrimary}`}>{fmtMoney(row.gross, baseCurrency)}</p>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full"
                      style={{ backgroundColor: provider.color }}
                    />
                  </div>
                  <div className={`flex items-center justify-between mt-1.5 text-[11px] ${s.textMuted}`}>
                    <span>Fees {fmtMoney(row.fees, baseCurrency)} · Net {fmtMoney(row.net, baseCurrency)}</span>
                    <span>{share.toFixed(1)}% of revenue</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color, hint, s, dark }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string;
  hint?: string; s: ReturnType<typeof getAdminStyles>; dark: boolean;
}) {
  return (
    <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-start gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
        <div className={color}><Icon className="w-5 h-5" /></div>
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-bold ${s.textPrimary} truncate`}>{value}</p>
        <p className={`text-[11px] font-medium ${s.textSecondary}`}>{label}</p>
        {hint && <p className={`text-[10px] ${s.textMuted} truncate`}>{hint}</p>}
      </div>
    </div>
  );
}

export default function ReportsView({
  transactions, config, counts,
}: { transactions: ReportTransaction[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <ReportsContent transactions={transactions} />
    </AdminShell>
  );
}
