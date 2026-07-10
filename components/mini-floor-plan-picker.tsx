"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Users, Clock, Wrench, AlertCircle, Map as MapIcon } from "lucide-react";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";

/* ────────────────────────────────────────────────────────────────────────
   Mini floor plan — used as the room picker inside the booking drawer.
   Same architectural language as the main FloorPlan but smaller, denser,
   and selection-focused. Each room shows status + check-out date.
   ────────────────────────────────────────────────────────────────────── */

export type PickableRoom = {
  id: string;
  name: string;
  type: string;
  status: "available" | "occupied" | "reserved" | "maintenance";
  checkOut: string | null;
  nightsLeft: number | null;
  guestName: string | null;
};

const STATUS = {
  available:   { label: "Available",   accent: "#22c55e", soft: "rgba(34,197,94,0.10)",  icon: Check,  pickable: true  },
  occupied:    { label: "Occupied",    accent: "#3b82f6", soft: "rgba(59,130,246,0.12)", icon: Users,  pickable: false },
  reserved:    { label: "Reserved",    accent: "#a855f7", soft: "rgba(168,85,247,0.12)", icon: Clock,  pickable: false },
  maintenance: { label: "Maintenance", accent: "#f59e0b", soft: "rgba(245,158,11,0.14)", icon: Wrench, pickable: false },
} as const;
type Status = keyof typeof STATUS;

const CELL_W = 78;
const CELL_H = 96;
const HALL = 36;
const PAD = 14;

function naturalSort(a: string, b: string) {
  const re = /(\d+)|(\D+)/g;
  const ax = a.match(re) ?? [];
  const bx = b.match(re) ?? [];
  for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
    const aN = parseInt(ax[i], 10), bN = parseInt(bx[i], 10);
    if (!isNaN(aN) && !isNaN(bN)) { if (aN !== bN) return aN - bN; }
    else if (ax[i] !== bx[i]) return ax[i].localeCompare(bx[i]);
  }
  return ax.length - bx.length;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function MiniFloorPlanPicker({
  rooms,
  currentRoomId,
  onPick,
  pendingId,
  errorMessage,
}: {
  /** All active rooms of the type the booking is for (passed pre-filtered). */
  rooms: PickableRoom[];
  /** Currently-assigned room — highlighted as "current" and always pickable */
  currentRoomId: string;
  onPick: (id: string) => void;
  /** Show pending state on this room id (after click, before server responds) */
  pendingId: string | null;
  errorMessage?: string | null;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);

  const sorted = useMemo(() => [...rooms].sort((a, b) => naturalSort(a.name, b.name)), [rooms]);
  const half = Math.ceil(sorted.length / 2);
  const top = sorted.slice(0, half);
  const bottom = sorted.slice(half);

  const cols = Math.max(top.length, bottom.length);
  const w = PAD * 2 + cols * CELL_W;
  const h = PAD * 2 + CELL_H * 2 + HALL;

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (sorted.length === 0) {
    return (
      <div className={`${s.sectionBg} rounded-xl p-6 text-center`}>
        <MapIcon className={`w-6 h-6 mx-auto mb-2 ${s.textMuted}`} />
        <p className={`text-xs ${s.textMuted}`}>No rooms found for this type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Status legend (dense) */}
      <div className="flex items-center gap-2.5 text-[9px] flex-wrap">
        {(Object.keys(STATUS) as Status[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: STATUS[k].accent }} />
            <span className={s.textMuted}>{STATUS[k].label}</span>
          </span>
        ))}
      </div>

      {/* Mini-plan canvas */}
      <div
        className="relative rounded-xl border-2 overflow-hidden"
        style={{
          background: dark
            ? "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)"
            : "linear-gradient(135deg, #fbf8f3 0%, #f5f1e8 100%)",
          borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.18)",
        }}
      >
        <div className="overflow-x-auto p-2">
          <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
            <defs>
              <pattern id="picker-grid" width="14" height="14" patternUnits="userSpaceOnUse">
                <path d="M 14 0 L 0 0 0 14" fill="none" stroke={dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.05)"} strokeWidth="0.5" />
              </pattern>
              <pattern id="picker-hall" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect x="0.4" y="0.4" width="9.2" height="9.2" fill="none" stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.07)"} strokeWidth="0.4" />
              </pattern>
              <pattern id="picker-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={STATUS.maintenance.accent} strokeWidth="1.2" />
              </pattern>
            </defs>

            <rect width={w} height={h} fill="url(#picker-grid)" />

            {/* Hallway */}
            {bottom.length > 0 && (
              <motion.rect
                x={PAD} y={PAD + CELL_H}
                width={w - PAD * 2} height={HALL}
                fill="url(#picker-hall)"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              />
            )}

            {/* CORRIDOR label */}
            {bottom.length > 0 && (
              <motion.text
                x={w / 2} y={PAD + CELL_H + HALL / 2 + 2}
                textAnchor="middle"
                fontSize={6} letterSpacing={3} fontWeight={700}
                fill={dark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.40)"}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                CORRIDOR
              </motion.text>
            )}

            {/* Top row */}
            {top.map((r, i) => (
              <Cell
                key={r.id}
                room={r}
                x={PAD + i * CELL_W}
                y={PAD}
                side="top"
                isCurrent={r.id === currentRoomId}
                isHovered={hoveredId === r.id}
                isPending={pendingId === r.id}
                onPick={() => onPick(r.id)}
                onHover={setHoveredId}
                delay={0.15 + i * 0.04}
                dark={dark}
              />
            ))}

            {/* Bottom row */}
            {bottom.map((r, i) => (
              <Cell
                key={r.id}
                room={r}
                x={PAD + i * CELL_W}
                y={PAD + CELL_H + HALL}
                side="bottom"
                isCurrent={r.id === currentRoomId}
                isHovered={hoveredId === r.id}
                isPending={pendingId === r.id}
                onPick={() => onPick(r.id)}
                onHover={setHoveredId}
                delay={0.15 + (top.length + i) * 0.04}
                dark={dark}
              />
            ))}
          </svg>
        </div>

        {/* Inline error from the action */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="m-2 mt-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
            >
              <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover/selected detail strip */}
      <AnimatePresence mode="wait">
        {(() => {
          const focusedId = hoveredId ?? currentRoomId;
          const focused = sorted.find((r) => r.id === focusedId);
          if (!focused) return null;
          const st = STATUS[focused.status];
          return (
            <motion.div
              key={focused.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-xl ${s.sectionBg}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.accent }} />
                <p className={`text-sm font-bold ${s.textPrimary}`}>Room {focused.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold`} style={{ backgroundColor: st.soft, color: st.accent }}>
                  {st.label}
                </span>
              </div>
              <div className={`text-[11px] text-right ${s.textSecondary}`}>
                {focused.status === "available" ? (
                  <span>Ready to assign</span>
                ) : focused.status === "maintenance" ? (
                  <span>Out of service</span>
                ) : (
                  <span>
                    Out {focused.checkOut ? shortDate(focused.checkOut) : "—"}
                    {focused.nightsLeft !== null && (
                      <span className={`ml-1 ${s.textMuted}`}>· {focused.nightsLeft}N left</span>
                    )}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Cell ──────────────────────────────────────────────

function Cell({
  room, x, y, side, isCurrent, isHovered, isPending,
  onPick, onHover, delay, dark,
}: {
  room: PickableRoom;
  x: number; y: number;
  side: "top" | "bottom";
  isCurrent: boolean;
  isHovered: boolean;
  isPending: boolean;
  onPick: () => void;
  onHover: (id: string | null) => void;
  delay: number;
  dark: boolean;
}) {
  const st = STATUS[room.status];
  const pickable = st.pickable || isCurrent;
  const wallColor = dark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.45)";
  const labelColor = dark ? "#eaf6ff" : "#1e293b";

  // Door geometry
  const doorR = 8;
  const doorY = side === "top" ? y + CELL_H : y;

  return (
    <motion.g
      onClick={pickable ? onPick : undefined}
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: pickable ? "pointer" : "not-allowed" }}
      initial={{ opacity: 0, y: side === "top" ? -8 : 8 }}
      animate={{ opacity: pickable ? 1 : 0.55, y: 0 }}
      whileHover={pickable ? { scale: 1.05, transition: { duration: 0.12 } } : undefined}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Floor tint */}
      <rect
        x={x + 1} y={y + 1} width={CELL_W - 2} height={CELL_H - 2}
        rx={2} fill={st.soft}
      />

      {/* Maintenance hatching */}
      {room.status === "maintenance" && (
        <rect x={x + 1} y={y + 1} width={CELL_W - 2} height={CELL_H - 2} rx={2}
          fill="url(#picker-hatch)" opacity={0.45} />
      )}

      {/* Walls */}
      <rect
        x={x + 1} y={y + 1} width={CELL_W - 2} height={CELL_H - 2}
        rx={2} fill="none" stroke={wallColor} strokeWidth={1}
      />

      {/* Door opening + arc */}
      <line
        x1={x + CELL_W / 2 - doorR} y1={doorY}
        x2={x + CELL_W / 2 + doorR} y2={doorY}
        stroke={dark ? "rgba(15,23,42,0.95)" : "#fbf8f3"} strokeWidth={2}
      />
      <line
        x1={x + CELL_W / 2 - doorR} y1={doorY}
        x2={x + CELL_W / 2 - doorR + doorR}
        y2={side === "top" ? doorY - doorR : doorY + doorR}
        stroke={st.accent} strokeWidth={1.2}
      />
      <path
        d={
          side === "top"
            ? `M ${x + CELL_W / 2 - doorR} ${doorY} A ${doorR} ${doorR} 0 0 1 ${x + CELL_W / 2 + doorR} ${doorY - doorR}`
            : `M ${x + CELL_W / 2 - doorR} ${doorY} A ${doorR} ${doorR} 0 0 0 ${x + CELL_W / 2 + doorR} ${doorY + doorR}`
        }
        fill="none" stroke={st.accent} strokeWidth={0.6} strokeDasharray="2 2"
      />

      {/* Bed (mini) */}
      <rect
        x={x + 14} y={y + CELL_H - 36}
        width={CELL_W - 28} height={20}
        rx={1.5}
        fill={st.accent} fillOpacity={0.10}
        stroke={st.accent} strokeOpacity={0.5} strokeWidth={0.6}
      />
      {/* Pillow line */}
      <line x1={x + 16} y1={y + CELL_H - 32} x2={x + CELL_W - 16} y2={y + CELL_H - 32}
        stroke={st.accent} strokeOpacity={0.4} strokeWidth={0.5} />

      {/* Pulse for occupied/reserved */}
      {(room.status === "occupied" || room.status === "reserved") && (
        <motion.circle
          cx={x + CELL_W / 2} cy={doorY}
          r={2.5}
          fill={st.accent}
          animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, delay }}
        />
      )}

      {/* Room number */}
      <text x={x + 6} y={y + 14} fontSize={11} fontWeight={700} fill={labelColor}>
        {room.name}
      </text>

      {/* Check-out date for occupied/reserved */}
      {(room.status === "occupied" || room.status === "reserved") && room.checkOut && (
        <text x={x + CELL_W - 6} y={y + 14}
          fontSize={6} fontWeight={700} fill={st.accent} textAnchor="end" letterSpacing={0.4}>
          → {shortDate(room.checkOut)}
        </text>
      )}

      {/* CURRENT badge */}
      {isCurrent && (
        <g>
          <rect x={x + 6} y={y + CELL_H - 14} width={36} height={9} rx={2} fill={st.accent} />
          <text x={x + 24} y={y + CELL_H - 7.5}
            textAnchor="middle" fontSize={6} fontWeight={800} fill="#fff" letterSpacing={0.6}>
            CURRENT
          </text>
        </g>
      )}

      {/* Selection ring (hover/current) */}
      {(isHovered || isCurrent) && pickable && (
        <motion.rect
          x={x - 1} y={y - 1} width={CELL_W + 2} height={CELL_H + 2}
          rx={3} fill="none"
          stroke={st.accent} strokeWidth={1.8}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Pending overlay when the user just clicked */}
      {isPending && (
        <motion.rect
          x={x + 1} y={y + 1} width={CELL_W - 2} height={CELL_H - 2}
          rx={2} fill="rgba(255,255,255,0.6)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        />
      )}

      {/* Lock icon for non-pickable */}
      {!pickable && room.status !== "available" && !isCurrent && (
        <text
          x={x + CELL_W - 8} y={y + CELL_H - 4}
          textAnchor="end" fontSize={6} fontWeight={700}
          fill={st.accent} opacity={0.7}
        >
          ✕
        </text>
      )}
    </motion.g>
  );
}
