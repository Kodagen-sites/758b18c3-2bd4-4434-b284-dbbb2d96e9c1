"use client";

import { useState, useActionState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Shield, Users, Check, AlertCircle, Save, Trash2,
  Key, Eye, EyeOff, Clock, User, Mail,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import type { SiteConfig } from "@/lib/types";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import {
  createTeamMember, updateTeamMember, removeTeamMember, resetTeamPassword,
  type ActionResult,
} from "../_actions/team";

export type TeamMember = {
  userId: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  isCurrentUser: boolean;
  createdAt: string;
};

type AuditEntry = {
  userEmail: string; userName: string; action: string;
  entityType: string; entityId: string;
  details: Record<string, unknown>; createdAt: string;
};

const ROLES = [
  { value: "owner",                label: "Owner",                desc: "Full access — manages team, billing, settings, everything", group: "Super Admin" },
  { value: "admin",                label: "Admin",                desc: "Full access like owner — can manage team and settings", group: "Super Admin" },
  { value: "general_manager",      label: "General Manager",      desc: "Oversees all operations, reports, content — no team management", group: "Management" },
  { value: "front_office_manager", label: "Front Office Manager", desc: "Full booking control, rooms, transactions, security — no settings", group: "Management" },
  { value: "supervisor",           label: "Supervisor",           desc: "Create & modify bookings, view transactions, handle inquiries", group: "Operations" },
  { value: "receptionist",         label: "Receptionist",         desc: "Check-in/out, create bookings, view rooms — no financials", group: "Operations" },
  { value: "night_auditor",        label: "Night Auditor",        desc: "Check-in, view transactions & reports, security — overnight shift", group: "Operations" },
  { value: "concierge",            label: "Concierge",            desc: "View bookings & events, reply to inquiries — guest services", group: "Operations" },
  { value: "housekeeping",         label: "Housekeeping",         desc: "View room status only — knows which rooms to clean", group: "Support" },
  { value: "accountant",           label: "Accountant",           desc: "Transactions, reports, export — financial access only", group: "Support" },
  { value: "viewer",               label: "Viewer",               desc: "Read-only dashboard — can't modify anything", group: "Read Only" },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/10 text-purple-600 ring-purple-500/30",
  admin: "bg-purple-500/10 text-purple-600 ring-purple-500/30",
  general_manager: "bg-blue-500/10 text-blue-600 ring-blue-500/30",
  front_office_manager: "bg-blue-500/10 text-blue-600 ring-blue-500/30",
  supervisor: "bg-green-500/10 text-green-600 ring-green-500/30",
  receptionist: "bg-amber-500/10 text-amber-600 ring-amber-500/30",
  night_auditor: "bg-indigo-500/10 text-indigo-600 ring-indigo-500/30",
  concierge: "bg-cyan-500/10 text-cyan-600 ring-cyan-500/30",
  housekeeping: "bg-pink-500/10 text-pink-600 ring-pink-500/30",
  accountant: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30",
  viewer: "bg-gray-500/10 text-gray-500 ring-gray-500/20",
};

type Tab = "members" | "activity";

function TeamContent({ members, audit, currentRole }: { members: TeamMember[]; audit: AuditEntry[]; currentRole: string }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [tab, setTab] = useState<Tab>("members");
  const [showCreate, setShowCreate] = useState(false);
  const canManage = currentRole === "owner" || currentRole === "admin";

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Team & Activity</h1>
          <p className={`text-sm mt-1 ${s.textSecondary}`}>Manage staff accounts, roles, and view the audit trail.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
            <Plus className="w-4 h-4" /> Add member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-1 p-1 rounded-2xl border ${s.cardBorder} ${s.cardBg}`}>
        {[
          { id: "members" as Tab, label: "Team members", icon: Users, count: members.length },
          { id: "activity" as Tab, label: "Activity log", icon: Clock, count: audit.length },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`
              }`}
              style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
              <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${active ? "bg-white/20" : `${dark ? "bg-white/[0.06]" : "bg-gray-100"} ${s.textMuted}`}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
          {members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
              <p className={`text-sm ${s.textMuted}`}>No team members yet</p>
            </div>
          ) : (
            <div className={s.divider}>
              {members.map((m) => (
                <MemberRow key={m.userId} member={m} canManage={canManage} s={s} dark={dark} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === "activity" && (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} overflow-hidden`}>
          {audit.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
              <p className={`text-sm ${s.textMuted}`}>No activity logged yet</p>
            </div>
          ) : (
            <div className={s.divider}>
              {audit.map((a, i) => (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5`}
                    style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
                    {a.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${s.textPrimary}`}>
                      <strong>{a.userName || a.userEmail}</strong>
                      {" "}<span className={s.textSecondary}>{formatAction(a.action)}</span>
                      {a.entityId && <span className={`font-mono text-xs ${s.textMuted}`}> {a.entityId}</span>}
                    </p>
                    <p className={`text-[11px] ${s.textMuted} mt-0.5`}>
                      {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at {new Date(a.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create member modal */}
      <AnimatePresence>
        {showCreate && <CreateMemberModal onClose={() => setShowCreate(false)} s={s} dark={dark} />}
      </AnimatePresence>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    "booking.confirmed": "confirmed booking",
    "booking.active": "checked in guest for",
    "booking.completed": "checked out guest for",
    "booking.cancelled": "cancelled booking",
    "booking.no_show": "marked no-show for",
    "booking.create": "created walk-in booking",
    "team.create": "added team member",
    "team.update": "updated team member",
    "team.remove": "removed team member",
    "team.reset_password": "reset password for",
  };
  return map[action] ?? action.replace(/\./g, " ");
}

function MemberRow({ member: m, canManage, s, dark }: {
  member: TeamMember; canManage: boolean;
  s: ReturnType<typeof getAdminStyles>; dark: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState<ActionResult | null, FormData>(updateTeamMember, null);
  const [removeState, removeAction, removePending] = useActionState<ActionResult | null, FormData>(removeTeamMember, null);
  const [resetState, resetAction, resetPending] = useActionState<ActionResult | null, FormData>(resetTeamPassword, null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => { if (updateState?.ok) setEditing(false); }, [updateState]);
  useEffect(() => { if (resetState?.ok) setShowReset(false); }, [resetState]);

  const roleCls = ROLE_COLORS[m.role] ?? ROLE_COLORS.viewer;

  return (
    <div className={`px-5 py-4 ${!m.active ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
            {m.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold truncate ${s.textPrimary}`}>{m.name}</p>
              {m.isCurrentUser && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${dark ? "bg-white/[0.08] text-gray-400" : "bg-gray-100 text-gray-500"}`}>You</span>}
              {!m.active && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500">Disabled</span>}
            </div>
            <p className={`text-xs ${s.textMuted} truncate`}>{m.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${roleCls}`}>
            {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
          </span>
          {canManage && !m.isCurrentUser && (
            <div className="flex gap-1">
              <button onClick={() => setEditing(!editing)} className={`p-1.5 rounded-lg ${s.hoverBg}`} title="Edit role">
                <Shield className={`w-3.5 h-3.5 ${s.textSecondary}`} />
              </button>
              <button onClick={() => setShowReset(!showReset)} className={`p-1.5 rounded-lg ${s.hoverBg}`} title="Reset password">
                <Key className={`w-3.5 h-3.5 ${s.textSecondary}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit role inline */}
      {editing && (
        <form action={updateAction} className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] space-y-2">
          <input type="hidden" name="userId" value={m.userId} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Name</label>
              <input name="name" defaultValue={m.name} className={`w-full px-3 py-2 rounded-lg border text-xs ${s.inputBg}`} />
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Role</label>
              <select name="role" defaultValue={m.role} className={`w-full px-3 py-2 rounded-lg border text-xs ${s.inputBg}`}>
                {["Super Admin", "Management", "Operations", "Support", "Read Only"].map((group) => (
                  <optgroup key={group} label={group}>
                    {ROLES.filter((r) => r.group === group).map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="hidden" name="active" value={m.active ? "true" : "false"} />
            <input type="checkbox" defaultChecked={m.active} onChange={(e) => {
              const input = e.target.parentElement?.querySelector("input[name=active]") as HTMLInputElement;
              if (input) input.value = e.target.checked ? "true" : "false";
            }} className="rounded" />
            <span className={s.textSecondary}>Account active</span>
          </label>
          <div className={`mt-2 p-2.5 rounded-lg border ${s.cardBorder} space-y-1.5`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>Data visibility</p>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input type="checkbox" name="unmask_email" className="rounded" /><span className={s.textSecondary}>See full emails</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input type="checkbox" name="unmask_phone" className="rounded" /><span className={s.textSecondary}>See full phones</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input type="checkbox" name="unmask_name" defaultChecked className="rounded" /><span className={s.textSecondary}>See full names</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input type="checkbox" name="see_revenue" className="rounded" /><span className={s.textSecondary}>See revenue amounts</span>
            </label>
          </div>
          {updateState && !updateState.ok && <p className="text-xs text-red-600">{updateState.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={updatePending} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
              {updatePending ? "Saving…" : "Save"}
            </button>
            {!confirmRemove ? (
              <button type="button" onClick={() => setConfirmRemove(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-500/20">Remove</button>
            ) : (
              <form action={removeAction} className="flex gap-1">
                <input type="hidden" name="userId" value={m.userId} />
                <button type="submit" disabled={removePending} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600">{removePending ? "…" : "Confirm remove"}</button>
                <button type="button" onClick={() => setConfirmRemove(false)} className={`px-2 py-1.5 rounded-lg text-xs ${s.textSecondary}`}>Cancel</button>
              </form>
            )}
          </div>
        </form>
      )}

      {/* Reset password inline */}
      {showReset && (
        <form action={resetAction} className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] space-y-2">
          <input type="hidden" name="userId" value={m.userId} />
          <label className={`text-[10px] font-bold uppercase tracking-wider ${s.textMuted}`}>New password (min 8 chars)</label>
          <input name="password" type="text" required minLength={8} placeholder="Enter new password" className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${s.inputBg}`} />
          {resetState && !resetState.ok && <p className="text-xs text-red-600">{resetState.error}</p>}
          {resetState?.ok && <p className="text-xs text-green-600 font-semibold">✓ Password reset</p>}
          <button type="submit" disabled={resetPending} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
            {resetPending ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </div>
  );
}

function CreateMemberModal({ onClose, s, dark }: { onClose: () => void; s: ReturnType<typeof getAdminStyles>; dark: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createTeamMember, null);
  const [showPw, setShowPw] = useState(false);
  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;

  useEffect(() => { if (state?.ok) { const t = setTimeout(onClose, 800); return () => clearTimeout(t); } }, [state, onClose]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Flex-wrapper centering — framer-motion writes an inline `transform`,
          which silently kills Tailwind -translate-x/y-1/2 centering and left
          the panel's lower half (incl. the submit button) off-screen. */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-md ${s.cardBg} rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto`}>
        <div className={`p-6 border-b ${s.borderLight} flex items-center justify-between`}>
          <h2 className={`text-lg font-bold ${s.textPrimary}`}>Add team member</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${s.hoverBg}`}><X className={`w-4 h-4 ${s.textSecondary}`} /></button>
        </div>

        {state?.ok ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4"><Check className="w-7 h-7 text-green-500" /></div>
            <h3 className={`font-bold ${s.textPrimary}`}>Team member added!</h3>
          </motion.div>
        ) : (
          <form action={action} className="p-6 space-y-4">
            {state && !state.ok && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </div>
            )}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Full name</label>
              <div className="relative">
                <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
                <input name="name" required placeholder="John Doe" className={`${inputCls} pl-10`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
                <input name="email" type="email" required placeholder="john@hotel.com" className={`${inputCls} pl-10`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Password</label>
              <div className="relative">
                <Key className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
                <input name="password" type={showPw ? "text" : "password"} required minLength={8} placeholder="Min 8 characters" className={`${inputCls} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPw(!showPw)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${s.textMuted}`}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Role</label>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {["Super Admin", "Management", "Operations", "Support", "Read Only"].map((group) => {
                  const groupRoles = ROLES.filter((r) => r.group === group);
                  if (groupRoles.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 ${s.textMuted}`}>{group}</p>
                      <div className="space-y-1.5">
                        {groupRoles.map((r) => (
                          <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${s.cardBorder} ${s.hoverBg}`}>
                            <input type="radio" name="role" value={r.value} defaultChecked={r.value === "receptionist"} className="mt-1" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold ${s.textPrimary}`}>{r.label}</p>
                                <span className={`px-1.5 py-0 rounded text-[9px] font-bold ring-1 ${ROLE_COLORS[r.value] ?? ROLE_COLORS.viewer}`}>{r.label}</span>
                              </div>
                              <p className={`text-xs ${s.textMuted} mt-0.5`}>{r.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Data masking options */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Data visibility</label>
              <div className={`p-3 rounded-xl border ${s.cardBorder} space-y-2`}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="unmask_email" defaultChecked={false} className="rounded" />
                  <div>
                    <p className={`text-xs font-semibold ${s.textPrimary}`}>See full guest emails</p>
                    <p className={`text-[11px] ${s.textMuted}`}>Off = shows j****@gmail.com</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="unmask_phone" defaultChecked={false} className="rounded" />
                  <div>
                    <p className={`text-xs font-semibold ${s.textPrimary}`}>See full guest phone numbers</p>
                    <p className={`text-[11px] ${s.textMuted}`}>Off = shows +234 *** *** 5678</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="unmask_name" defaultChecked={true} className="rounded" />
                  <div>
                    <p className={`text-xs font-semibold ${s.textPrimary}`}>See full guest names</p>
                    <p className={`text-[11px] ${s.textMuted}`}>Off = shows J**** I****</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="see_revenue" defaultChecked={false} className="rounded" />
                  <div>
                    <p className={`text-xs font-semibold ${s.textPrimary}`}>See revenue & payment amounts</p>
                    <p className={`text-[11px] ${s.textMuted}`}>Off = prices show as {CURRENCY_SYMBOL}***</p>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
              <Save className="w-4 h-4" /> {pending ? "Creating…" : "Create account"}
            </button>
          </form>
        )}
      </motion.div>
      </div>
    </>
  );
}

export default function TeamView({
  members, audit, currentRole, config, counts,
}: { members: TeamMember[]; audit: AuditEntry[]; currentRole: string; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return (
    <AdminShell config={config} counts={counts}>
      <TeamContent members={members} audit={audit} currentRole={currentRole} />
    </AdminShell>
  );
}
