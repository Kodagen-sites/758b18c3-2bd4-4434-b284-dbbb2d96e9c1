"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  Wrench, Users, Clock, Check, Layers as LayersIcon, Building2, X,
  Compass, ZoomIn, ZoomOut, RotateCcw, Sparkles, Ruler, Calendar,
} from "lucide-react";
import type { Room, RoomType } from "@/data/mock-rooms";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { CURRENCY_SYMBOL } from "@/lib/currency";

/* ────────────────────────────────────────────────────────────────────────
   Architectural floor plan
   ────────────────────────────────────────────────────────────────────────
   - Pure SVG geometry: walls, doors, beds, desks, bathrooms drawn with real
     architectural symbols (door swing arc, fixed-window double line, etc).
   - Walls "draw in" on mount via stroke-dashoffset animation.
   - Rooms cascade in with stagger; furniture pops with spring.
   - Pan + zoom via framer-motion drag with spring-back.
   - Two visual modes: "draft" (cream paper, pencil) and "blueprint" (deep blue,
     white lines + neon status).
   - A scanline sweeps over the plan once on load for a "reveal" moment.
*/

// ─── Status palette ────────────────────────────────────────────────────

type Mode = "draft" | "blueprint";

const STATUS = {
  available:   { label: "Available",   accent: "#22c55e", soft: "rgba(34,197,94,0.10)",   icon: Check },
  occupied:    { label: "Occupied",    accent: "#3b82f6", soft: "rgba(59,130,246,0.12)",  icon: Users },
  reserved:    { label: "Reserved",    accent: "#a855f7", soft: "rgba(168,85,247,0.12)",  icon: Clock },
  maintenance: { label: "Maintenance", accent: "#f59e0b", soft: "rgba(245,158,11,0.14)",  icon: Wrench },
} as const;
type Status = keyof typeof STATUS;

// Visual style swap per mode
const MODE_STYLE = {
  draft: {
    bg:         "linear-gradient(135deg, #fbf8f3 0%, #f0eadb 100%)",
    paper:      "#fbf8f3",
    wallMain:   "#1f2937",   // outer walls
    wallInner:  "#374151",   // partitions
    annotation: "#6b7280",
    gridLine:   "rgba(15,23,42,0.04)",
    titleBlock: "rgba(255,255,255,0.65)",
    label:      "#1e293b",
    furniture:  "#9ca3af",
  },
  blueprint: {
    bg:         "linear-gradient(135deg, #0a2540 0%, #0d3a6b 100%)",
    paper:      "#0a2540",
    wallMain:   "#cfe7ff",
    wallInner:  "#9bc8ef",
    annotation: "#7fb1da",
    gridLine:   "rgba(159,200,239,0.08)",
    titleBlock: "rgba(255,255,255,0.06)",
    label:      "#eaf6ff",
    furniture:  "#5a8db8",
  },
} as const;

// ─── Floor inference ───────────────────────────────────────────────────

function floorFor(name: string): number {
  const t = name.trim();
  if (/penthouse/i.test(t)) return 99;
  const m = t.match(/^(\d+)/);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  if (n >= 100) return Math.floor(n / 100);
  return 1;
}

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

// ─── Layouts ───────────────────────────────────────────────────────────

type Layout = "double-corridor" | "single-corridor" | "L-shape";
const LAYOUTS: { id: Layout; label: string }[] = [
  { id: "double-corridor", label: "Double corridor" },
  { id: "single-corridor", label: "Single corridor" },
  { id: "L-shape",         label: "L-shape" },
];

// ─── Geometry constants (SVG units) ────────────────────────────────────

const ROOM_W = 110;
const ROOM_H = 130;
const WALL = 3;            // outer wall thickness
const WALL_INNER = 1.6;    // partition thickness
const HALL = 70;           // hallway depth between facing rows
const PADDING = 70;        // canvas padding

// Compute the per-floor layout in SVG coordinates.
function planLayout(layout: Layout, rooms: Room[]) {
  type Cell = { room: Room; x: number; y: number; side: "top" | "bottom" | "right"; index: number };
  const cells: Cell[] = [];

  if (layout === "single-corridor") {
    rooms.forEach((r, i) => {
      cells.push({ room: r, x: PADDING + i * ROOM_W, y: PADDING, side: "top", index: i });
    });
    const w = PADDING * 2 + Math.max(rooms.length, 1) * ROOM_W;
    const h = PADDING * 2 + ROOM_H + 60; // + corridor below
    return { cells, w, h, layout };
  }

  if (layout === "L-shape") {
    const half = Math.ceil(rooms.length / 2);
    rooms.slice(0, half).forEach((r, i) => {
      cells.push({ room: r, x: PADDING + i * ROOM_W, y: PADDING, side: "top", index: i });
    });
    rooms.slice(half).forEach((r, i) => {
      // Right wing — rotate 90° (rooms stack vertically on the right edge)
      const xCol = PADDING + half * ROOM_W + HALL;
      cells.push({ room: r, x: xCol, y: PADDING + ROOM_H + 30 + i * ROOM_W, side: "right", index: i });
    });
    const w = PADDING * 2 + half * ROOM_W + HALL + ROOM_H;
    const h = PADDING * 2 + ROOM_H + 30 + (rooms.length - half) * ROOM_W;
    return { cells, w, h, layout };
  }

  // double-corridor (default)
  const half = Math.ceil(rooms.length / 2);
  rooms.slice(0, half).forEach((r, i) => {
    cells.push({ room: r, x: PADDING + i * ROOM_W, y: PADDING, side: "top", index: i });
  });
  rooms.slice(half).forEach((r, i) => {
    cells.push({ room: r, x: PADDING + i * ROOM_W, y: PADDING + ROOM_H + HALL, side: "bottom", index: i });
  });
  const w = PADDING * 2 + Math.max(half, rooms.length - half) * ROOM_W;
  const h = PADDING * 2 + ROOM_H * 2 + HALL;
  return { cells, w, h, layout };
}

// ─── Architectural primitives ─────────────────────────────────────────

/** Animated SVG line — strokes itself in. */
function Wall({ x1, y1, x2, y2, color, w = WALL, delay = 0, dur = 0.7 }: {
  x1: number; y1: number; x2: number; y2: number; color: string; w?: number; delay?: number; dur?: number;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return (
    <motion.line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={w} strokeLinecap="round"
      initial={{ strokeDasharray: len, strokeDashoffset: len }}
      animate={{ strokeDashoffset: 0 }}
      transition={{ duration: dur, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

/** Door swing arc — universal architectural symbol */
function DoorSwing({ cx, cy, r, startAngle, endAngle, color, delay }: {
  cx: number; cy: number; r: number;
  startAngle: number; endAngle: number;
  color: string; delay: number;
}) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: delay + 0.2 }}
    >
      <motion.path
        d={d}
        stroke={color} strokeWidth={0.8} fill="none"
        strokeDasharray="3 3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.2, ease: "easeOut" }}
      />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth={1.2} />
    </motion.g>
  );
}

/** Bed icon as actual SVG furniture (mattress + pillow + frame) */
function BedSVG({ x, y, w, h, color, delay }: {
  x: number; y: number; w: number; h: number; color: string; delay: number;
}) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: `${x + w / 2}px ${y + h / 2}px` }}
    >
      {/* Frame */}
      <rect x={x} y={y} width={w} height={h} rx={2}
        fill="none" stroke={color} strokeWidth={0.8} />
      {/* Mattress (slightly inset) */}
      <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} rx={1.5}
        fill={color} fillOpacity={0.10} stroke={color} strokeWidth={0.5} />
      {/* Pillows (top edge) */}
      <rect x={x + 3} y={y + 2.5} width={(w - 8) / 2} height={6} rx={1}
        fill={color} fillOpacity={0.18} stroke={color} strokeWidth={0.3} />
      <rect x={x + 5 + (w - 8) / 2} y={y + 2.5} width={(w - 8) / 2} height={6} rx={1}
        fill={color} fillOpacity={0.18} stroke={color} strokeWidth={0.3} />
      {/* Center seam */}
      <line x1={x + w / 2} y1={y + 10} x2={x + w / 2} y2={y + h - 2} stroke={color} strokeWidth={0.3} strokeDasharray="1.2 1.2" />
    </motion.g>
  );
}

/** Bathroom block (toilet circle + sink) */
function BathroomSVG({ x, y, w, h, color, delay }: {
  x: number; y: number; w: number; h: number; color: string; delay: number;
}) {
  return (
    <motion.g
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.1 }}
    >
      <rect x={x} y={y} width={w} height={h} rx={1}
        fill={color} fillOpacity={0.06} stroke={color} strokeWidth={0.5} strokeDasharray="2 1.5" />
      {/* Toilet */}
      <ellipse cx={x + w * 0.3} cy={y + h * 0.55} rx={3} ry={4}
        fill="none" stroke={color} strokeWidth={0.5} />
      <rect x={x + w * 0.3 - 4} y={y + h * 0.25} width={8} height={3} rx={0.5}
        fill="none" stroke={color} strokeWidth={0.4} />
      {/* Sink */}
      <rect x={x + w * 0.55} y={y + h * 0.4} width={w * 0.4} height={5} rx={1}
        fill="none" stroke={color} strokeWidth={0.5} />
    </motion.g>
  );
}

/** Side table + lamp */
function NightstandSVG({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: delay + 0.15 }}>
      <rect x={x} y={y} width={8} height={8} rx={1}
        fill="none" stroke={color} strokeWidth={0.5} />
      <circle cx={x + 4} cy={y + 4} r={1.6} fill={color} fillOpacity={0.5} />
    </motion.g>
  );
}

// ─── Room cell (the star of the show) ─────────────────────────────────

function RoomCell({
  room,
  cell,
  type,
  modeStyle,
  isHovered,
  isSelected,
  onSelect,
  onHover,
  delay,
}: {
  room: Room;
  cell: { x: number; y: number; side: "top" | "bottom" | "right"; index: number };
  type?: RoomType;
  modeStyle: (typeof MODE_STYLE)[keyof typeof MODE_STYLE];
  isHovered: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
  delay: number;
}) {
  const status = STATUS[room.status as Status] ?? STATUS.available;
  const { x, y, side } = cell;

  // Door geometry — door sits on the corridor-facing side
  const doorGap = 14;            // door opening width
  const doorSwingR = 14;         // arc radius
  let doorX = x + ROOM_W / 2 - doorGap / 2;
  let doorY = side === "top" ? y + ROOM_H : y;
  if (side === "right") {
    doorX = x;
    doorY = y + ROOM_H / 2 - doorGap / 2;
  }

  return (
    <motion.g
      onClick={onSelect}
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}
    >
      {/* Floor tint */}
      <motion.rect
        x={x} y={y} width={ROOM_W} height={ROOM_H}
        rx={2}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isSelected ? 1 : isHovered ? 0.95 : 0.75,
          scale: isHovered ? 1.012 : 1,
        }}
        transition={{ duration: 0.25, delay }}
        style={{ transformOrigin: `${x + ROOM_W / 2}px ${y + ROOM_H / 2}px` }}
        fill={status.soft}
      />

      {/* Selected glow ring */}
      {isSelected && (
        <motion.rect
          x={x - 2} y={y - 2} width={ROOM_W + 4} height={ROOM_H + 4}
          rx={4} fill="none"
          stroke={status.accent} strokeWidth={2.5}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Walls — drawn in via stroke-dashoffset */}
      <Wall x1={x}              y1={y}              x2={x + ROOM_W}      y2={y}             color={modeStyle.wallInner} w={WALL_INNER} delay={delay} />
      <Wall x1={x + ROOM_W}     y1={y}              x2={x + ROOM_W}     y2={y + ROOM_H}    color={modeStyle.wallInner} w={WALL_INNER} delay={delay + 0.05} />
      <Wall x1={x + ROOM_W}     y1={y + ROOM_H}    x2={x}              y2={y + ROOM_H}    color={modeStyle.wallInner} w={WALL_INNER} delay={delay + 0.1} />
      <Wall x1={x}              y1={y + ROOM_H}    x2={x}              y2={y}             color={modeStyle.wallInner} w={WALL_INNER} delay={delay + 0.15} />

      {/* Door opening — break in the wall */}
      <motion.line
        x1={doorX} y1={doorY}
        x2={doorX + doorGap} y2={side === "right" ? doorY + doorGap : doorY}
        stroke={modeStyle.paper} strokeWidth={WALL_INNER + 1.4}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.2 }}
      />

      {/* Door leaf + swing arc */}
      <DoorSwing
        cx={side === "right" ? doorX : doorX + doorGap}
        cy={side === "right" ? doorY + doorGap : doorY}
        r={doorSwingR}
        startAngle={side === "top" ? -90 : side === "right" ? 0 : -180}
        endAngle={side === "top" ? -180 : side === "right" ? -90 : -90}
        color={status.accent}
        delay={delay + 0.25}
      />

      {/* Bathroom (top-right corner of the room) */}
      <BathroomSVG x={x + ROOM_W - 30} y={y + 6} w={24} h={28} color={modeStyle.furniture} delay={delay + 0.35} />

      {/* Bed (centre-bottom of room — feet toward corridor) */}
      <BedSVG x={x + 18} y={y + ROOM_H - 50} w={ROOM_W - 36} h={36} color={modeStyle.furniture} delay={delay + 0.45} />

      {/* Nightstand */}
      <NightstandSVG x={x + 6} y={y + ROOM_H - 50} color={modeStyle.furniture} delay={delay + 0.5} />

      {/* Status door dot — pulses when occupied */}
      <motion.circle
        cx={side === "right" ? x : x + ROOM_W / 2}
        cy={side === "right" ? y + ROOM_H / 2 : (side === "top" ? y + ROOM_H : y)}
        r={3.5}
        fill={status.accent}
        initial={{ opacity: 0, scale: 0 }}
        animate={
          room.status === "occupied" || room.status === "reserved"
            ? { opacity: [0.7, 1, 0.7], scale: [1, 1.4, 1] }
            : { opacity: 1, scale: 1 }
        }
        transition={
          room.status === "occupied" || room.status === "reserved"
            ? { duration: 2.4, repeat: Infinity, delay: delay + 0.6 }
            : { duration: 0.3, delay: delay + 0.6 }
        }
      />

      {/* Maintenance hatching overlay */}
      {room.status === "maintenance" && (
        <motion.rect
          x={x} y={y} width={ROOM_W} height={ROOM_H}
          fill="url(#hatch-maintenance)" opacity={0.5}
          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
          transition={{ delay: delay + 0.5 }}
        />
      )}

      {/* Room number — large label */}
      <motion.text
        x={x + 8} y={y + 18}
        fontSize={11} fontWeight={700} fill={modeStyle.label}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.4 }}
      >
        {room.roomNumber}
      </motion.text>

      {/* Type abbreviation tag */}
      {type && (
        <motion.text
          x={x + ROOM_W - 8} y={y + 14}
          fontSize={6} fontWeight={700} fill={modeStyle.annotation}
          textAnchor="end" letterSpacing={0.5}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.45 }}
        >
          {type.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
        </motion.text>
      )}

      {/* Hover halo */}
      {isHovered && !isSelected && (
        <motion.rect
          x={x - 1} y={y - 1} width={ROOM_W + 2} height={ROOM_H + 2}
          rx={3} fill="none"
          stroke={status.accent} strokeWidth={1} strokeOpacity={0.6}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}
    </motion.g>
  );
}

// ─── One floor canvas ─────────────────────────────────────────────────

function FloorCanvas({
  floorNum, rooms, layout, typeById, mode, onPick,
  hoveredId, setHoveredId, selectedId,
}: {
  floorNum: number;
  rooms: Room[];
  layout: Layout;
  typeById: Map<string, RoomType>;
  mode: Mode;
  onPick: (r: Room) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  selectedId: string | null;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const modeStyle = MODE_STYLE[mode];
  const plan = useMemo(() => planLayout(layout, rooms), [layout, rooms]);

  // Pan + zoom
  const [zoom, setZoom] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xs = useSpring(x, { damping: 28, stiffness: 220 });
  const ys = useSpring(y, { damping: 28, stiffness: 220 });

  function reset() {
    setZoom(1);
    x.set(0);
    y.set(0);
  }

  const floorLabel = floorNum === 99 ? "Penthouse" : `Floor ${String(floorNum).padStart(2, "0")}`;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2"
      style={{
        background: modeStyle.bg,
        borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.18)",
      }}
    >
      {/* Top-left floor label */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span
          className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-[0.18em] uppercase"
          style={{
            background: modeStyle.titleBlock,
            color: modeStyle.label,
            backdropFilter: "blur(4px)",
          }}
        >
          {floorLabel}
        </span>
        <span
          className="px-2 py-1 rounded-md text-[10px] font-semibold"
          style={{ background: modeStyle.titleBlock, color: modeStyle.annotation }}
        >
          {rooms.length} room{rooms.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Top-right zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex gap-1">
        <ZoomBtn modeStyle={modeStyle} onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} aria="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></ZoomBtn>
        <ZoomBtn modeStyle={modeStyle} onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} aria="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></ZoomBtn>
        <ZoomBtn modeStyle={modeStyle} onClick={reset} aria="Reset view"><RotateCcw className="w-3.5 h-3.5" /></ZoomBtn>
      </div>

      {/* Bottom-right title block */}
      <div
        className="absolute bottom-3 right-3 z-20 px-3 py-2 rounded-lg text-[9px] uppercase tracking-[0.2em]"
        style={{
          background: modeStyle.titleBlock,
          color: modeStyle.annotation,
          fontFamily: "var(--font-heading)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Compass className="w-3 h-3" /> N ↑</span>
          <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> 1:50</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
        </div>
      </div>

      {/* Pan/zoom canvas */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: Math.min(560, plan.h + 40), cursor: "grab" }}
      >
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={{ left: -plan.w * 0.5, right: plan.w * 0.5, top: -plan.h * 0.4, bottom: plan.h * 0.4 }}
          style={{ x: xs, y: ys, scale: zoom, transformOrigin: "center center" }}
          className="w-full h-full flex items-center justify-center"
        >
          <svg
            viewBox={`0 0 ${plan.w} ${plan.h}`}
            width={plan.w}
            height={plan.h}
            style={{ display: "block", maxWidth: "100%", maxHeight: "100%" }}
          >
            {/* Defs — patterns + gradients */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke={modeStyle.gridLine} strokeWidth="0.5" />
              </pattern>
              <pattern id="hatch-maintenance" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke={STATUS.maintenance.accent} strokeWidth="1.4" />
              </pattern>
              <pattern id="hall-tile" width="14" height="14" patternUnits="userSpaceOnUse">
                <rect x="0.5" y="0.5" width="13" height="13" fill="none" stroke={modeStyle.gridLine} strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Grid background */}
            <rect width={plan.w} height={plan.h} fill="url(#grid)" />

            {/* Hallway floor pattern */}
            {plan.layout === "double-corridor" && (
              <motion.rect
                x={PADDING}
                y={PADDING + ROOM_H}
                width={plan.w - PADDING * 2}
                height={HALL}
                fill="url(#hall-tile)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              />
            )}

            {/* Outer building boundary — heavy outline drawn last */}
            <Wall x1={PADDING - WALL/2}         y1={PADDING - WALL/2}        x2={plan.w - PADDING + WALL/2} y2={PADDING - WALL/2}        color={modeStyle.wallMain} w={WALL} delay={0.05} />
            <Wall x1={plan.w - PADDING + WALL/2} y1={PADDING - WALL/2}       x2={plan.w - PADDING + WALL/2} y2={plan.h - PADDING + WALL/2} color={modeStyle.wallMain} w={WALL} delay={0.15} />
            <Wall x1={plan.w - PADDING + WALL/2} y1={plan.h - PADDING + WALL/2} x2={PADDING - WALL/2}       y2={plan.h - PADDING + WALL/2} color={modeStyle.wallMain} w={WALL} delay={0.25} />
            <Wall x1={PADDING - WALL/2}         y1={plan.h - PADDING + WALL/2} x2={PADDING - WALL/2}       y2={PADDING - WALL/2}         color={modeStyle.wallMain} w={WALL} delay={0.35} />

            {/* Hallway label */}
            {plan.layout === "double-corridor" && (
              <motion.text
                x={plan.w / 2}
                y={PADDING + ROOM_H + HALL / 2 + 3}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                letterSpacing={6}
                fill={modeStyle.annotation}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
              >
                CORRIDOR
              </motion.text>
            )}

            {/* Rooms */}
            {plan.cells.map((cell) => (
              <RoomCell
                key={cell.room.id}
                room={cell.room}
                cell={cell}
                type={typeById.get(cell.room.roomTypeId)}
                modeStyle={modeStyle}
                isHovered={hoveredId === cell.room.id}
                isSelected={selectedId === cell.room.id}
                onSelect={() => onPick(cell.room)}
                onHover={setHoveredId}
                delay={0.5 + cell.index * 0.04}
              />
            ))}

            {/* Scanline reveal — sweeps across once */}
            <motion.rect
              x={0} y={0} width={4} height={plan.h}
              fill={mode === "blueprint" ? "rgba(180,220,255,0.6)" : "rgba(217,255,62,0.6)"}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: plan.w + 10, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.6, ease: "easeOut", delay: 0.1 }}
              style={{ filter: "blur(3px)" }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Bottom-left zoom indicator */}
      <div
        className="absolute bottom-3 left-3 z-20 px-2 py-1 rounded-md text-[10px] font-bold"
        style={{ background: modeStyle.titleBlock, color: modeStyle.annotation }}
      >
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

function ZoomBtn({ children, onClick, aria, modeStyle }: {
  children: React.ReactNode; onClick: () => void; aria: string; modeStyle: (typeof MODE_STYLE)[keyof typeof MODE_STYLE];
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className="w-7 h-7 rounded-md flex items-center justify-center transition hover:scale-105 active:scale-95"
      style={{ background: modeStyle.titleBlock, color: modeStyle.annotation, backdropFilter: "blur(4px)" }}
    >
      {children}
    </button>
  );
}

// ─── Detail modal ──────────────────────────────────────────────────────

function RoomDetailModal({
  room, type, onClose,
}: {
  room: Room | null;
  type?: RoomType;
  onClose: () => void;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);

  return (
    <AnimatePresence>
      {room && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`fixed z-[90] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm ${s.cardBg} rounded-2xl shadow-2xl overflow-hidden`}
          >
            <div
              className="relative h-28"
              style={{ backgroundColor: STATUS[room.status as Status].soft }}
            >
              <div className="absolute inset-0 flex items-end justify-between p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Room</p>
                  <h3 className="text-3xl font-extrabold text-gray-900">{room.roomNumber}</h3>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg bg-white/80 hover:bg-white shadow">
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-2 rounded-md shadow"
                style={{ backgroundColor: STATUS[room.status as Status].accent }}
              />
            </div>

            <div className="p-5 space-y-4">
              {type && (
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${s.textMuted}`}>Type</p>
                  <p className={`text-sm font-bold ${s.textPrimary}`}>{type.name}</p>
                  <p className={`text-xs ${s.textMuted}`}>{CURRENCY_SYMBOL}{type.pricePerNight.toLocaleString()}/night</p>
                </div>
              )}
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${s.textMuted}`}>Status</p>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: STATUS[room.status as Status].soft, color: STATUS[room.status as Status].accent }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS[room.status as Status].accent }} />
                  {STATUS[room.status as Status].label}
                </span>
              </div>
              {room.checkOut && (
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${s.textMuted}`}>Check-out</p>
                  <p className={`text-sm font-semibold ${s.textPrimary}`}>
                    {new Date(room.checkOut).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main FloorPlan component ─────────────────────────────────────────

export default function FloorPlan({
  rooms, roomTypes,
}: {
  rooms: Room[];
  roomTypes: RoomType[];
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [layout, setLayout] = useState<Layout>("double-corridor");
  const [mode, setMode] = useState<Mode>("draft");
  const [selected, setSelected] = useState<Room | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const typeById = useMemo(() => new Map(roomTypes.map((t) => [t.id, t] as const)), [roomTypes]);

  const floors = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const r of rooms) {
      const f = floorFor(r.roomNumber);
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(r);
    }
    for (const list of map.values()) list.sort((a, b) => naturalSort(a.roomNumber, b.roomNumber));
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [rooms]);

  const counts = useMemo(() => ({
    available:   rooms.filter((r) => r.status === "available").length,
    occupied:    rooms.filter((r) => r.status === "occupied").length,
    reserved:    rooms.filter((r) => r.status === "reserved").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
  }), [rooms]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-3 sm:p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
        {/* Layout picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <LayersIcon className={`w-4 h-4 ${s.textMuted}`} />
          <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${s.textMuted} mr-1`}>Layout</span>
          {LAYOUTS.map((l) => {
            const active = layout === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`
                }`}
                style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {(Object.keys(STATUS) as Status[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping" style={{ backgroundColor: STATUS[k].accent, animationDuration: "2.5s" }} />
                <span className="relative inline-flex rounded w-2.5 h-2.5" style={{ backgroundColor: STATUS[k].accent }} />
              </span>
              <span className={`text-[11px] font-medium ${s.textSecondary}`}>
                {STATUS[k].label}
                <span className={`ml-1 ${s.textMuted}`}>({counts[k]})</span>
              </span>
            </div>
          ))}
        </div>

        {/* Mode toggle */}
        <button
          onClick={() => setMode((m) => (m === "draft" ? "blueprint" : "draft"))}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${s.hoverBg}`}
          style={{
            background: mode === "blueprint"
              ? "linear-gradient(135deg, #0d3a6b, #1e5fa6)"
              : "linear-gradient(135deg, #f5f1e8, #fbf8f3)",
            color: mode === "blueprint" ? "#cfe7ff" : "#1e293b",
            border: mode === "blueprint" ? "1px solid rgba(207,231,255,0.25)" : "1px solid rgba(15,23,42,0.15)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {mode === "blueprint" ? "Blueprint mode" : "Draft mode"}
        </button>
      </div>

      {/* Floors */}
      {floors.length === 0 ? (
        <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
          <Building2 className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
          <p className={`text-sm font-medium ${s.textSecondary}`}>No rooms to render yet</p>
          <p className={`text-xs ${s.textMuted} mt-1`}>Add a room type with rooms to see the floor plan.</p>
        </div>
      ) : (
        floors.map(([floorNum, floorRooms]) => (
          <FloorCanvas
            key={`${mode}-${layout}-${floorNum}`}
            floorNum={floorNum}
            rooms={floorRooms}
            layout={layout}
            typeById={typeById}
            mode={mode}
            onPick={setSelected}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            selectedId={selected?.id ?? null}
          />
        ))
      )}

      {/* Detail modal */}
      <RoomDetailModal
        room={selected}
        type={selected ? typeById.get(selected.roomTypeId) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
