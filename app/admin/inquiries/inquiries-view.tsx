"use client";

import { useState, useActionState, useEffect } from "react";
import type { SiteConfig } from "@/lib/types";
import AdminShell from "@/components/admin/admin-shell";
import AdminDrawer from "@/components/admin/admin-drawer";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  MessageSquare, Phone, Mail, Reply, Check, Trash2, Archive, AlertCircle, Search, Inbox,
} from "lucide-react";
import type { Inquiry } from "@/lib/admin-types";
import { useMasked } from "@/lib/use-masked";
import {
  markInquiryRead, markInquiryReplied, archiveInquiry, deleteInquiry,
  type ActionResult,
} from "../_actions/inquiries";

// ─── Status pill ──────────────────────────────────────

function StatusBadge({ status, dark }: { status: Inquiry["status"]; dark: boolean }) {
  const map: Record<Inquiry["status"], { label: string; cls: string }> = {
    new:     { label: "New",     cls: dark ? "bg-blue-500/15 text-blue-400 ring-blue-500/20"   : "bg-blue-100 text-blue-700 ring-blue-200" },
    read:    { label: "Read",    cls: dark ? "bg-white/[0.06] text-gray-400 ring-white/[0.08]" : "bg-gray-100 text-gray-600 ring-gray-200" },
    replied: { label: "Replied", cls: dark ? "bg-green-500/15 text-green-400 ring-green-500/20" : "bg-green-100 text-green-700 ring-green-200" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${m.cls}`}>
      {m.label}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Detail body ─────────────────────────────────────

function InquiryDetail({ inquiry }: { inquiry: Inquiry }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const mk = useMasked();
  const created = new Date(inquiry.createdAt);

  return (
    <>
      {/* Contact summary */}
      <div className={`p-3 rounded-xl ${s.sectionBg} space-y-2`}>
        <div className="flex items-center gap-2 text-sm">
          <Mail className={`w-3.5 h-3.5 ${s.textMuted}`} />
          <a href={`mailto:${inquiry.email}`} className={`${s.textSecondary} hover:underline truncate`}>{mk.email(inquiry.email) || "No email"}</a>
        </div>
        {inquiry.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className={`w-3.5 h-3.5 ${s.textMuted}`} />
            <a href={`tel:${inquiry.phone}`} className={`${s.textSecondary} hover:underline`}>{mk.phone(inquiry.phone)}</a>
          </div>
        )}
      </div>

      {/* Message */}
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Message</p>
        <div className={`p-4 rounded-xl ${s.sectionBg}`}>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${s.textPrimary}`}>{inquiry.message}</p>
        </div>
      </div>

      <p className={`text-[10px] ${s.textMuted} text-center`}>
        Received {created.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at {created.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </>
  );
}

// ─── Action footer ───────────────────────────────────

function InquiryActions({ inquiry, onAfter }: { inquiry: Inquiry; onAfter: () => void }) {
  const [readState,    readAction,    readPending]    = useActionState<ActionResult | null, FormData>(markInquiryRead,    null);
  const [repliedState, repliedAction, repliedPending] = useActionState<ActionResult | null, FormData>(markInquiryReplied, null);
  const [archState,    archAction,    archPending]    = useActionState<ActionResult | null, FormData>(archiveInquiry,     null);
  const [delState,     delAction,     delPending]     = useActionState<ActionResult | null, FormData>(deleteInquiry,      null);
  const [confirmDel, setConfirmDel] = useState(false);

  // Close drawer on success
  useEffect(() => {
    if (readState?.ok || repliedState?.ok || archState?.ok || delState?.ok) {
      const t = setTimeout(onAfter, 350);
      return () => clearTimeout(t);
    }
  }, [readState, repliedState, archState, delState, onAfter]);

  const lastErr =
    (readState && !readState.ok && readState.error) ||
    (repliedState && !repliedState.ok && repliedState.error) ||
    (archState && !archState.ok && archState.error) ||
    (delState && !delState.ok && delState.error) ||
    null;

  return (
    <div className="space-y-2">
      {lastErr && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          <AlertCircle className="w-3.5 h-3.5" /> {lastErr}
        </div>
      )}

      {/* Primary: reply */}
      <a
        href={`mailto:${inquiry.email}?subject=Re: Your inquiry`}
        onClick={() => {
          // Auto-mark replied when the user opens their mail client
          const fd = new FormData();
          fd.append("id", inquiry.id);
          repliedAction(fd);
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition hover:scale-[1.02]"
        style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
      >
        <Reply className="w-4 h-4" />
        {repliedPending ? "Saving…" : "Reply by email"}
      </a>

      {/* Secondary row */}
      <div className="grid grid-cols-3 gap-2">
        {inquiry.status === "new" && (
          <form action={readAction}>
            <input type="hidden" name="id" value={inquiry.id} />
            <button type="submit" disabled={readPending} title="Mark as read"
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-gray-300/40 text-gray-600 hover:bg-gray-100/60 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04] disabled:opacity-60">
              <Check className="w-3.5 h-3.5" /> Read
            </button>
          </form>
        )}
        <form action={archAction} className={inquiry.status === "new" ? "" : "col-span-2"}>
          <input type="hidden" name="id" value={inquiry.id} />
          <button type="submit" disabled={archPending} title="Archive"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-gray-300/40 text-gray-600 hover:bg-gray-100/60 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04] disabled:opacity-60">
            <Archive className="w-3.5 h-3.5" /> Archive
          </button>
        </form>
        {!confirmDel ? (
          <button type="button" onClick={() => setConfirmDel(true)} title="Delete"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-red-500/20 text-red-600 hover:bg-red-500/10">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        ) : (
          <form action={delAction} className="col-span-3 flex gap-2">
            <input type="hidden" name="id" value={inquiry.id} />
            <button type="button" onClick={() => setConfirmDel(false)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-300/40 text-gray-600 hover:bg-gray-100/60 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]">
              Cancel
            </button>
            <button type="submit" disabled={delPending}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
              {delPending ? "Deleting…" : "Confirm delete"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────

function InquiriesContent({ inquiries }: { inquiries: Inquiry[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const m = useMasked();
  const [filter, setFilter] = useState<"all" | Inquiry["status"]>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);

  const filtered = inquiries.filter((inq) => {
    if (filter !== "all" && inq.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!inq.name.toLowerCase().includes(q)
        && !inq.email.toLowerCase().includes(q)
        && !inq.message.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all:     inquiries.length,
    new:     inquiries.filter((i) => i.status === "new").length,
    read:    inquiries.filter((i) => i.status === "read").length,
    replied: inquiries.filter((i) => i.status === "replied").length,
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div>
        <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Inquiries</h1>
        <p className={`text-sm mt-1 ${s.textSecondary}`}>Click any message to read it and reply.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Total"    value={counts.all}     icon={Inbox}         color="text-blue-500"   s={s} dark={dark} />
        <Kpi label="New"      value={counts.new}     icon={MessageSquare} color="text-amber-500"  s={s} dark={dark} />
        <Kpi label="Read"     value={counts.read}    icon={Check}         color="text-gray-500"   s={s} dark={dark} />
        <Kpi label="Replied"  value={counts.replied} icon={Reply}         color="text-green-500"  s={s} dark={dark} />
      </div>

      {/* Filters + search */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-3 space-y-3`}>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "new", "read", "replied"] as const).map((f) => {
            const active = filter === f;
            const label = f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1);
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
                  {counts[f]}
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
            placeholder="Search name, email, or message…"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
          />
        </div>
      </div>

      {/* Full-width list */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden ${s.divider}`}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
            <p className={`text-sm font-medium ${s.textSecondary}`}>No inquiries found</p>
            <p className={`text-xs ${s.textMuted} mt-1`}>
              {inquiries.length === 0
                ? "Messages from your contact form land here."
                : "Try a different filter or search term."}
            </p>
          </div>
        ) : (
          filtered.map((inq) => {
            const isUnread = inq.status === "new";
            return (
              <button
                key={inq.id}
                onClick={() => setSelected(inq)}
                className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${s.hoverBg}`}
              >
                {/* Unread dot */}
                <div className="pt-1.5 w-2 flex-shrink-0">
                  {isUnread && <span className="block w-2 h-2 rounded-full bg-blue-500" />}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
                  {initials(inq.name)}
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className={`text-sm truncate ${isUnread ? `font-bold ${s.textPrimary}` : `font-semibold ${s.textSecondary}`}`}>
                      {m.name(inq.name)}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={inq.status} dark={dark} />
                      <span className={`text-[10px] ${s.textMuted}`}>
                        {new Date(inq.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs truncate ${s.textMuted} mb-1`}>{m.email(inq.email)}</p>
                  <p className={`text-xs line-clamp-2 ${s.textSecondary}`}>{inq.message}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Drawer */}
      <AdminDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? m.name(selected.name) : ""}
        subtitle={selected ? m.email(selected.email) : undefined}
        badge={selected && <StatusBadge status={selected.status} dark={dark} />}
        avatar={selected && (
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
            {initials(selected.name)}
          </div>
        )}
        actions={selected && <InquiryActions inquiry={selected} onAfter={() => setSelected(null)} />}
      >
        {selected && <InquiryDetail inquiry={selected} />}
      </AdminDrawer>
    </div>
  );
}

function Kpi({
  label, value, icon: Icon, color, s, dark,
}: {
  label: string; value: number | string;
  icon: React.ComponentType<{ className?: string }>; color: string;
  s: ReturnType<typeof getAdminStyles>; dark: boolean;
}) {
  return (
    <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
        <div className={color}><Icon className="w-5 h-5" /></div>
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold ${s.textPrimary}`}>{value}</p>
        <p className={`text-[11px] ${s.textMuted}`}>{label}</p>
      </div>
    </div>
  );
}

export default function InquiriesView({
  inquiries, config, counts,
}: { inquiries: Inquiry[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <InquiriesContent inquiries={inquiries} />
    </AdminShell>
  );
}
