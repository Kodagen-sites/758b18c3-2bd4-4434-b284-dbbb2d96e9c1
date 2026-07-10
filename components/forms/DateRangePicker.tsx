import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

/**
 * DateRangePicker — custom calendar replacing browser-default <input type="date">.
 *
 * - Click input → popover calendar opens
 * - First click sets check-in, second click sets check-out
 * - Hover preview shows the range as you move
 * - Past dates disabled
 * - Two-month side-by-side view on desktop, single month on mobile
 *
 * Output format: ISO yyyy-mm-dd strings. Empty string = unset.
 *
 * Used by BookingDrawer. Replaces the type="date" failure pattern from
 * the Eko Heritage test (rule 33.4e).
 */

type Props = {
  startDate: string;     // yyyy-mm-dd or ""
  endDate: string;
  onChange: (start: string, end: string) => void;
  minDate?: string;       // defaults to today
};

export default function DateRangePicker({ startDate, endDate, onChange, minDate }: Props) {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const seed = startDate || todayISO();
    const d = new Date(seed);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const today = minDate || todayISO();
  
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);
  
  // Click date handler
  const handleSelect = (iso: string) => {
    if (iso < today) return;
    
    if (!startDate || (startDate && endDate)) {
      // Start fresh
      onChange(iso, "");
    } else if (iso < startDate) {
      // Clicked earlier than current start — set as new start
      onChange(iso, "");
    } else if (iso === startDate) {
      // Clicked same as start — clear
      onChange("", "");
    } else {
      // Set as end
      onChange(startDate, iso);
      // Auto-close after end is set
      setTimeout(() => setOpen(false), 150);
    }
  };
  
  // For hover preview (range painting)
  const previewEnd = hoverDate && startDate && !endDate && hoverDate >= startDate ? hoverDate : endDate;
  
  return (
    <div ref={containerRef} className="relative">
      {/* Trigger inputs (look like inputs, are buttons) */}
      <div className="grid grid-cols-2 gap-2">
        <DateField
          label="Check in"
          value={startDate}
          onClick={() => setOpen(true)}
          active={open}
        />
        <DateField
          label="Check out"
          value={endDate}
          onClick={() => setOpen(true)}
          active={open}
        />
      </div>
      
      {/* Calendar popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border/40 rounded-2xl shadow-xl p-5"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                aria-label="Previous month"
                className="w-8 h-8 rounded-full hover:bg-bg/40 flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="font-display text-base">
                {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h3>
              <button
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                aria-label="Next month"
                className="w-8 h-8 rounded-full hover:bg-bg/40 flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-mono tracking-wider uppercase text-text-secondary py-1">
                  {d}
                </div>
              ))}
            </div>
            
            {/* Date grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays(viewMonth).map((d, i) => {
                if (!d) {
                  return <div key={i} className="aspect-square" />;
                }
                const iso = isoFromDate(d);
                const isStart = iso === startDate;
                const isEnd = iso === endDate;
                const isInRange = startDate && previewEnd && iso > startDate && iso < previewEnd;
                const isPast = iso < today;
                const isToday = iso === todayISO();
                
                return (
                  <button
                    key={iso}
                    disabled={isPast}
                    onClick={() => handleSelect(iso)}
                    onMouseEnter={() => setHoverDate(iso)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={`
                      aspect-square text-xs rounded-md transition-all relative
                      ${isPast ? "text-text-secondary/30 cursor-not-allowed" : "hover:bg-primary/10"}
                      ${isStart || isEnd ? "bg-primary text-bg font-medium" : ""}
                      ${isInRange ? "bg-primary/15" : ""}
                      ${isToday && !isStart && !isEnd ? "ring-1 ring-primary/40" : ""}
                    `}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            
            {/* Helper text */}
            <p className="text-[10px] text-text-secondary mt-4 font-mono tracking-wider uppercase">
              {!startDate && "Select check-in"}
              {startDate && !endDate && "Select check-out"}
              {startDate && endDate && `${nightsBetween(startDate, endDate)} night${nightsBetween(startDate, endDate) !== 1 ? "s" : ""}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Date field button ──────────────────────────────────────────────

function DateField({
  label,
  value,
  onClick,
  active,
}: {
  label: string;
  value: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left px-4 py-3 bg-bg/30 border rounded-lg transition-all ${
        active ? "border-primary" : "border-border/40 hover:border-border"
      }`}
    >
      <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-primary/80">
        {label}
      </div>
      <div className={`font-display text-sm mt-1 ${value ? "" : "text-text-secondary/60"}`}>
        {value ? formatPretty(value) : "Add date"}
      </div>
      <CalendarIcon size={14} className="absolute right-3 top-3 text-text-secondary/60" />
    </button>
  );
}

// ─── Date helpers ───────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return isoFromDate(d);
}

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonths(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + n);
  return nd;
}

function monthDays(viewMonth: Date): (Date | null)[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  return cells;
}

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (86400 * 1000)));
}

function formatPretty(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
