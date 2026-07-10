"use client";

import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";

/**
 * Common hotel amenities — admin checks the ones that apply rather than typing
 * them. Anything not in this list can be added via the "Custom amenity" input.
 */
const AMENITY_CATALOG = [
  // Beds & comfort
  "King Bed", "Queen Bed", "Twin Beds", "Sofa Bed",
  // In-room
  "WiFi", "Mini Bar", "Smart TV", "Air Conditioning", "Safe", "Work Desk",
  // Bathroom
  "Rainfall Shower", "Bathtub", "Hair Dryer", "Bathrobes",
  // Premium
  "Balcony", "Sea View", "City View", "Pool View", "Butler Service",
  "Living Area", "Walk-in Closet", "Jacuzzi",
  // Service
  "Room Service", "Daily Housekeeping", "Lounge Access", "Airport Transfer",
];

export default function AmenitiesPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [custom, setCustom] = useState("");

  // Combine catalog + any custom amenities the user has already saved
  // (so "Penthouse Terrace" etc. show up checked instead of vanishing).
  const merged = Array.from(new Set([...AMENITY_CATALOG, ...value]));

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  function addCustom() {
    const t = custom.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setCustom("");
  }

  return (
    <div>
      <div className={`grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto p-2 rounded-xl border ${s.cardBorder} ${s.sectionBg}`}>
        {merged.map((a) => {
          const checked = value.includes(a);
          const isCustom = !AMENITY_CATALOG.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition ${
                checked
                  ? `${dark ? "bg-white/[0.08] text-white" : "bg-white text-gray-900"} ring-1`
                  : `${s.textSecondary} ${s.hoverBg}`
              }`}
              style={checked ? { ["--tw-ring-color" as string]: "var(--color-accent)" } : undefined}
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition ${
                  checked
                    ? "text-white"
                    : `border ${dark ? "border-white/[0.15]" : "border-gray-300"}`
                }`}
                style={checked ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
              >
                {checked && <Check className="w-3 h-3" />}
              </span>
              <span className="truncate flex-1">{a}</span>
              {isCustom && (
                <span className={`text-[9px] px-1 rounded ${dark ? "bg-white/[0.06] text-gray-500" : "bg-gray-100 text-gray-500"}`}>
                  custom
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom add */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add custom amenity (e.g. Pet Friendly)"
          className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className={`px-3 py-2 rounded-xl text-xs font-bold border ${s.cardBorder} ${s.textSecondary} ${s.hoverBg} disabled:opacity-50 inline-flex items-center gap-1`}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Selected pills (for quick removal) */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {value.map((a) => (
            <span
              key={a}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-gray-700"}`}
            >
              {a}
              <button type="button" onClick={() => toggle(a)} className="hover:text-red-500" aria-label={`Remove ${a}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className={`text-[11px] mt-2 ${s.textMuted}`}>
        {value.length} selected · click an amenity to toggle, or type your own and press Enter.
      </p>
    </div>
  );
}
