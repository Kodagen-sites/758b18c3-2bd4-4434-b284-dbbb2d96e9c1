"use client";

import { useState, useMemo } from "react";
import AdminShell from "@/components/admin/admin-shell";
import AdminDrawer from "@/components/admin/admin-drawer";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { useMasked } from "@/lib/use-masked";
import {
  Search, Wallet, CheckCircle, Clock, AlertCircle, RotateCcw,
  CreditCard, X as XIcon, Receipt, FileText,
} from "lucide-react";
import type { SiteConfig } from "@/lib/types";
import { CURRENCY_CODE, CURRENCY_SYMBOL } from "@/lib/currency";

export type AdminTransaction = {
  id: string;
  bookingId: string | null;
  bookingRef: string;
  roomNumber: string;
  roomType: string;
  provider: "paystack" | "stripe" | "manual";
  providerRef: string;
  amount: number;       // major units
  fee: number;
  net: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  customerEmail: string;
  customerName: string;
  errorMessage: string;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  raw: Record<string, unknown> | null;
};

// ─── Status palette ───────────────────────────────────

const STATUS = {
  succeeded: { label: "Paid",      cls: "bg-green-500/10 text-green-600 ring-green-500/30",  dot: "bg-green-500", icon: CheckCircle },
  pending:   { label: "Pending",   cls: "bg-amber-500/10 text-amber-600 ring-amber-500/30",  dot: "bg-amber-500", icon: Clock },
  failed:    { label: "Failed",    cls: "bg-red-500/10 text-red-600 ring-red-500/30",        dot: "bg-red-500",   icon: AlertCircle },
  refunded:  { label: "Refunded",  cls: "bg-purple-500/15 text-purple-600 ring-purple-500/30", dot: "bg-purple-500", icon: RotateCcw },
} as const;
type Status = keyof typeof STATUS;

const PROVIDER_STYLE: Record<string, { label: string; color: string }> = {
  paystack: { label: "Paystack", color: "#0BA4DB" },
  stripe:   { label: "Stripe",   color: "#635BFF" },
  manual:   { label: "Manual",   color: "#6B7280" },
};

function StatusPill({ status }: { status: Status }) {
  const c = STATUS[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${c.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
}

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── Detail drawer body ───────────────────────────────

function TxDetail({ tx }: { tx: AdminTransaction }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const provider = PROVIDER_STYLE[tx.provider] ?? PROVIDER_STYLE.manual;

  return (
    <>
      {/* Money block */}
      <div className={`p-4 rounded-2xl ${s.sectionBg} text-center`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${s.textMuted}`}>Amount</p>
        <p className={`text-3xl font-extrabold ${s.textPrimary} mt-1`}>{fmtMoney(tx.amount, tx.currency)}</p>
        {tx.fee > 0 && (
          <p className={`text-[11px] mt-1 ${s.textMuted}`}>
            Gateway fee {fmtMoney(tx.fee, tx.currency)} · Net {fmtMoney(tx.net, tx.currency)}
          </p>
        )}
      </div>

      {/* Provider + reference */}
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Provider" s={s}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color }} />
            <span className={`text-sm font-bold ${s.textPrimary}`}>{provider.label}</span>
          </div>
        </Tile>
        <Tile label="Status" s={s}><StatusPill status={tx.status} /></Tile>
        <Tile label="Booking" s={s}>
          <p className={`text-xs font-mono ${s.textPrimary} truncate`}>{tx.bookingRef || "—"}</p>
        </Tile>
        <Tile label="Provider Ref" s={s}>
          <p className={`text-xs font-mono ${s.textSecondary} truncate`}>{tx.providerRef || "—"}</p>
        </Tile>
      </div>

      {/* Customer */}
      {(tx.customerName || tx.customerEmail) && (
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${s.textMuted}`}>Customer</p>
          <div className={`p-3 rounded-xl ${s.sectionBg}`}>
            {tx.customerName && <p className={`text-sm font-semibold ${s.textPrimary}`}>{tx.customerName}</p>}
            {tx.customerEmail && <p className={`text-xs ${s.textSecondary}`}>{tx.customerEmail}</p>}
          </div>
        </div>
      )}

      {tx.errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-700 font-semibold">
            <p className="uppercase tracking-wider text-[9px] opacity-70">Gateway error</p>
            <p>{tx.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Timeline</p>
        <div className={`space-y-2 p-3 rounded-xl ${s.sectionBg}`}>
          <TimelineRow icon={Receipt}     label="Initialised" iso={tx.createdAt}  s={s} />
          {tx.paidAt    && <TimelineRow icon={CheckCircle} label="Paid"       iso={tx.paidAt}    s={s} accent="text-green-600" />}
          {tx.refundedAt && <TimelineRow icon={RotateCcw}  label="Refunded"   iso={tx.refundedAt} s={s} accent="text-purple-600" />}
        </div>
      </div>

      {/* Raw payload */}
      {tx.raw && Object.keys(tx.raw).length > 0 && (
        <details>
          <summary className={`text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${s.textMuted}`}>
            Raw webhook payload
          </summary>
          <pre className={`mt-2 p-3 rounded-xl ${s.sectionBg} text-[10px] font-mono ${s.textSecondary} overflow-x-auto max-h-64`}>
            {JSON.stringify(tx.raw, null, 2)}
          </pre>
        </details>
      )}
    </>
  );
}

function Tile({ label, s, children }: { label: string; s: ReturnType<typeof getAdminStyles>; children: React.ReactNode }) {
  return (
    <div className={`p-3 rounded-xl ${s.sectionBg}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.textMuted}`}>{label}</p>
      {children}
    </div>
  );
}

function TimelineRow({
  icon: Icon, label, iso, s, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; iso: string;
  s: ReturnType<typeof getAdminStyles>;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`w-3.5 h-3.5 ${accent ?? s.textMuted}`} />
      <span className={`flex-1 font-semibold ${s.textPrimary}`}>{label}</span>
      <span className={s.textMuted}>{fmtDate(iso)} · <span className="font-mono">{fmtTime(iso)}</span></span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────

function TransactionsContent({ transactions }: { transactions: AdminTransaction[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const mm = useMasked();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminTransaction | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${t.bookingRef} ${t.providerRef} ${t.customerEmail} ${t.customerName} ${t.amount}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filter, search]);

  const counts = {
    all:       transactions.length,
    succeeded: transactions.filter((t) => t.status === "succeeded").length,
    pending:   transactions.filter((t) => t.status === "pending").length,
    failed:    transactions.filter((t) => t.status === "failed").length,
    refunded:  transactions.filter((t) => t.status === "refunded").length,
  };

  // KPIs from the master list
  const succeeded = transactions.filter((t) => t.status === "succeeded");
  const totalGross   = succeeded.reduce((s, t) => s + t.amount, 0);
  const totalFees    = succeeded.reduce((s, t) => s + t.fee, 0);
  const totalNet     = succeeded.reduce((s, t) => s + t.net, 0);
  const refundedSum  = transactions.filter((t) => t.status === "refunded").reduce((s, t) => s + t.amount, 0);
  const baseCurrency = succeeded[0]?.currency ?? CURRENCY_CODE;

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div>
        <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Transactions</h1>
        <p className={`text-sm mt-1 ${s.textSecondary}`}>Every payment, refund, and failed attempt against your bookings.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Gross collected" value={mm.canSeeRevenue ? fmtMoney(totalGross, baseCurrency) : `${CURRENCY_SYMBOL}***`} icon={Wallet}     color="text-green-500"  s={s} dark={dark} />
        <Kpi label="Gateway fees"    value={mm.canSeeRevenue ? fmtMoney(totalFees, baseCurrency) : `${CURRENCY_SYMBOL}***`}  icon={CreditCard} color="text-amber-500"  s={s} dark={dark} />
        <Kpi label="Net to bank"     value={mm.canSeeRevenue ? fmtMoney(totalNet, baseCurrency) : `${CURRENCY_SYMBOL}***`}   icon={CheckCircle} color="text-blue-500"   s={s} dark={dark} />
        <Kpi label="Refunded"        value={mm.canSeeRevenue ? fmtMoney(refundedSum, baseCurrency) : `${CURRENCY_SYMBOL}***`} icon={RotateCcw}  color="text-purple-500" s={s} dark={dark} />
      </div>

      {/* Filters + search */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-3 space-y-3`}>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "succeeded", "pending", "failed", "refunded"] as const).map((f) => {
            const active = filter === f;
            const label = f === "all" ? "All" : STATUS[f as Status]?.label ?? f;
            const cnt = counts[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`
                }`}
                style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
              >
                {label}
                <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : `${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textMuted}`}`}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by booking ref, provider ref, customer or amount…"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
          />
          {search && (
            <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted} hover:opacity-70`}>
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
            <p className={`text-sm font-medium ${s.textSecondary}`}>No transactions yet</p>
            <p className={`text-xs ${s.textMuted} mt-1`}>
              {transactions.length === 0
                ? "Payments will appear here once a customer pays for a booking."
                : "Try a different filter or search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${s.borderLight}`}>
                  <Th s={s}>Date</Th>
                  <Th s={s}>Customer</Th>
                  <Th s={s} className="hidden sm:table-cell">Room</Th>
                  <Th s={s} className="hidden md:table-cell">Booking</Th>
                  <Th s={s} className="hidden sm:table-cell">Provider</Th>
                  <Th s={s} className="text-right">Amount</Th>
                  <Th s={s}>Status</Th>
                </tr>
              </thead>
              <tbody className={s.divider}>
                {filtered.map((t) => {
                  const provider = PROVIDER_STYLE[t.provider] ?? PROVIDER_STYLE.manual;
                  return (
                    <tr key={t.id} onClick={() => setSelected(t)} className={`${s.hoverBg} cursor-pointer transition-colors`}>
                      <td className="px-4 py-3.5">
                        <p className={`text-sm font-semibold ${s.textPrimary}`}>{fmtDate(t.createdAt)}</p>
                        <p className={`text-[11px] font-mono ${s.textMuted}`}>{fmtTime(t.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`text-sm font-semibold ${s.textPrimary} truncate`}>{t.customerName ? mm.name(t.customerName) : t.customerEmail ? mm.email(t.customerEmail) : "—"}</p>
                        {t.customerEmail && t.customerName && <p className={`text-[11px] truncate ${s.textMuted}`}>{mm.email(t.customerEmail)}</p>}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        {t.roomNumber ? (
                          <>
                            <p className={`text-sm font-bold ${s.textPrimary}`}>{t.roomNumber}</p>
                            <p className={`text-[11px] ${s.textMuted}`}>{t.roomType}</p>
                          </>
                        ) : (
                          <p className={`text-xs ${s.textMuted}`}>—</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className={`text-xs font-mono ${s.textSecondary}`}>{t.bookingRef || "—"}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold" style={{ backgroundColor: `${provider.color}18`, color: provider.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: provider.color }} />
                          {provider.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-right`}>
                        <p className={`text-sm font-bold ${s.textPrimary}`}>{mm.canSeeRevenue ? fmtMoney(t.amount, t.currency) : `${CURRENCY_SYMBOL}***`}</p>
                        {t.fee > 0 && mm.canSeeRevenue && <p className={`text-[10px] ${s.textMuted}`}>fee {fmtMoney(t.fee, t.currency)}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      <AdminDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? fmtMoney(selected.amount, selected.currency) : ""}
        subtitle={selected ? `${PROVIDER_STYLE[selected.provider]?.label ?? selected.provider} · ${selected.bookingRef || "no booking"}` : undefined}
        badge={selected && <StatusPill status={selected.status} />}
        avatar={selected && (
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PROVIDER_STYLE[selected.provider]?.color ?? "#6B7280"}18` }}>
            <Receipt className="w-5 h-5" style={{ color: PROVIDER_STYLE[selected.provider]?.color ?? "#6B7280" }} />
          </div>
        )}
      >
        {selected && <TxDetail tx={selected} />}
      </AdminDrawer>
    </div>
  );
}

function Th({ children, s, className = "" }: { children: React.ReactNode; s: ReturnType<typeof getAdminStyles>; className?: string }) {
  return <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider ${s.textMuted} ${className}`}>{children}</th>;
}

function Kpi({ label, value, icon: Icon, color, s, dark }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string;
  s: ReturnType<typeof getAdminStyles>; dark: boolean;
}) {
  return (
    <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
        <div className={color}><Icon className="w-5 h-5" /></div>
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-bold ${s.textPrimary} truncate`}>{value}</p>
        <p className={`text-[11px] ${s.textMuted}`}>{label}</p>
      </div>
    </div>
  );
}

export default function TransactionsView({
  transactions, config, counts,
}: { transactions: AdminTransaction[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <TransactionsContent transactions={transactions} />
    </AdminShell>
  );
}
