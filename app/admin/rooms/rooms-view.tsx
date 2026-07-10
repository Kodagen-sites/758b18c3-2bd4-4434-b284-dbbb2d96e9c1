"use client";

import { useState, useActionState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SiteConfig } from "@/lib/types";
import type { RoomType, Room } from "@/data/mock-rooms";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import {
  Plus, X, BedDouble, Users, DollarSign, Edit2, Trash2,
  Check, AlertCircle, Wrench, Clock, Save,
  Image as ImageIcon,
} from "lucide-react";
import ImagePickerModal from "@/components/admin/image-picker-modal";
import AdminDrawer from "@/components/admin/admin-drawer";
import FloorPlan from "@/components/admin/floor-plan";
import { LayoutGrid, Map as MapIcon } from "lucide-react";
import {
  createRoomType, updateRoomType, deleteRoomType, toggleRoomActive,
  addRoomToType, renameRoom, deleteRoom,
  type ActionResult,
} from "../_actions/resources";
import AmenitiesPicker from "@/components/admin/amenities-picker";
import { CURRENCY_SYMBOL } from "@/lib/currency";

const roomStatusConfig: Record<string, { label: string; color: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  available: { label: "Available", color: "text-green-500", dot: "bg-green-500", icon: Check },
  occupied: { label: "Occupied", color: "text-blue-500", dot: "bg-blue-500", icon: Users },
  maintenance: { label: "Maintenance", color: "text-amber-500", dot: "bg-amber-500", icon: Wrench },
  reserved: { label: "Reserved", color: "text-purple-500", dot: "bg-purple-500", icon: Clock },
};

// ─── Room Type Card ────────────────────────────────────

function RoomTypeCard({
  roomType, rooms, isSelected, onSelect, dark, s,
}: {
  roomType: RoomType; rooms: Room[]; isSelected: boolean; onSelect: () => void; dark: boolean; s: ReturnType<typeof getAdminStyles>;
}) {
  const available = rooms.filter((r) => r.status === "available").length;
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const maintenance = rooms.filter((r) => r.status === "maintenance").length;
  const reserved = rooms.filter((r) => r.status === "reserved").length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0;

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`${s.cardBg} rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? "border-2 shadow-lg" : `${s.cardBorder} hover:shadow-md`
      }`}
      style={isSelected ? { borderColor: "var(--color-accent)" } : undefined}
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img src={roomType.image} alt={roomType.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <h3 className="text-white font-bold text-sm">{roomType.name}</h3>
            <p className="text-white/70 text-xs">{CURRENCY_SYMBOL}{roomType.pricePerNight.toLocaleString()}/night</p>
          </div>
          {(() => {
            // Status reflects the WHOLE inventory of this type:
            //   • some rooms in maintenance → amber "X in maintenance"
            //   • all rooms inactive       → red "Inactive"
            //   • everything else          → green "Active"
            const allInactive = rooms.length > 0 && rooms.every((r) => r.status === "maintenance");
            if (allInactive) {
              return (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400">
                  Inactive
                </span>
              );
            }
            if (maintenance > 0) {
              return (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400">
                  {maintenance} in maintenance
                </span>
              );
            }
            return (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/20 text-green-400">
                Active
              </span>
            );
          })()}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          {[
            { count: available, label: "Free", color: "text-green-500" },
            { count: occupied, label: "In Use", color: "text-blue-500" },
            { count: reserved, label: "Booked", color: "text-purple-500" },
            { count: maintenance, label: "Maint.", color: "text-amber-500" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.count}</p>
              <p className={`text-[10px] ${s.textMuted}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Occupancy bar */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-medium ${s.textMuted}`}>Occupancy</span>
          <span className={`text-[10px] font-bold ${s.textPrimary}`}>{occupancyRate}%</span>
        </div>
        <div className={`w-full h-2 rounded-full ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${occupancyRate}%`,
              background: `linear-gradient(90deg, var(--color-accent), var(--color-primary))`,
            }}
          />
        </div>

        <p className={`text-xs mt-2 ${s.textMuted}`}>
          {rooms.length} of {roomType.totalRooms} rooms shown
        </p>
      </div>
    </motion.div>
  );
}

// ─── Room Grid (individual rooms) ──────────────────────

function RoomGrid({ rooms, dark, s }: { rooms: Room[]; dark: boolean; s: ReturnType<typeof getAdminStyles> }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} dark={dark} s={s} />
      ))}
    </div>
  );
}

function RoomCard({ room, dark, s }: { room: Room; dark: boolean; s: ReturnType<typeof getAdminStyles> }) {
  const cfg = roomStatusConfig[room.status];
  const [_, toggleAction, togglePending] = useActionState<ActionResult | null, FormData>(toggleRoomActive, null);
  // Maintenance toggle = flips active flag. UI labels "Set maintenance" / "Mark available"
  const isMaintenance = room.status === "maintenance";
  const newActive = isMaintenance ? "true" : "false";
  return (
    <div className={`${s.cardBg} rounded-xl border ${s.cardBorder} p-3 text-center ${s.hoverBg} transition-all group relative`}>
      <p className={`text-sm font-bold ${s.textPrimary} mb-1`}>{room.roomNumber}</p>
      <div className={`flex items-center justify-center gap-1 ${cfg.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className="text-[10px] font-semibold">{cfg.label}</span>
      </div>
      {room.currentGuest && <p className={`text-[9px] mt-1.5 truncate ${s.textMuted}`}>{room.currentGuest}</p>}
      {room.checkOut && (
        <p className={`text-[9px] ${s.textMuted}`}>
          Out: {new Date(room.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </p>
      )}
      {(room.status === "available" || room.status === "maintenance") && (
        <form action={toggleAction} className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center bg-black/60 rounded-xl">
          <input type="hidden" name="id" value={room.id} />
          <input type="hidden" name="active" value={newActive} />
          <button type="submit" disabled={togglePending}
            className="px-2.5 py-1.5 rounded-lg bg-white text-[10px] font-bold text-gray-900 hover:bg-amber-100 disabled:opacity-60 flex items-center gap-1">
            <Wrench className="w-3 h-3" /> {togglePending ? "…" : (isMaintenance ? "Available" : "Maintenance")}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Rooms editor (used in EDIT mode of RoomTypeModal) ─

function RoomsEditor({ type, rooms, s, dark }: { type: string; rooms: Room[]; s: ReturnType<typeof getAdminStyles>; dark: boolean }) {
  const [renameState, renameAction] = useActionState<ActionResult | null, FormData>(renameRoom, null);
  const [delState, delAction] = useActionState<ActionResult | null, FormData>(deleteRoom, null);
  const [addState, addAction, addPending] = useActionState<ActionResult | null, FormData>(addRoomToType, null);
  const [newName, setNewName] = useState("");

  // Reset the new-room input on success
  useEffect(() => { if (addState?.ok) setNewName(""); }, [addState]);

  const lastErr =
    (renameState && !renameState.ok && renameState.error) ||
    (delState && !delState.ok && delState.error) ||
    (addState && !addState.ok && addState.error) ||
    null;

  return (
    <div>
      <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>
        Rooms <span className={s.textMuted}>· {rooms.length} total</span>
      </label>

      {lastErr && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          <AlertCircle className="w-3.5 h-3.5" /> {lastErr}
        </div>
      )}

      <div className={`space-y-1.5 max-h-56 overflow-y-auto p-2 rounded-xl border ${s.cardBorder} ${s.sectionBg}`}>
        {rooms.map((r) => (
          <RoomRow key={r.id} room={r} renameAction={renameAction} delAction={delAction} s={s} dark={dark} />
        ))}
        {rooms.length === 0 && (
          <p className={`text-xs text-center py-4 ${s.textMuted}`}>No rooms yet — add one below.</p>
        )}
      </div>

      {/* Add room */}
      <form action={addAction} className="flex gap-2 mt-2"
        onSubmit={(e) => {
          if (!newName.trim()) { e.preventDefault(); return; }
        }}>
        <input type="hidden" name="type" value={type} />
        <input
          name="name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New room number (e.g. 207, 12B, Penthouse)"
          className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
        />
        <button
          type="submit"
          disabled={addPending || !newName.trim()}
          className={`px-3 py-2 rounded-xl text-xs font-bold border ${s.cardBorder} ${s.textSecondary} ${s.hoverBg} disabled:opacity-50 inline-flex items-center gap-1`}
        >
          <Plus className="w-3.5 h-3.5" /> {addPending ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}

function RoomRow({
  room, renameAction, delAction, s, dark,
}: {
  room: Room;
  renameAction: (fd: FormData) => void;
  delAction: (fd: FormData) => void;
  s: ReturnType<typeof getAdminStyles>;
  dark: boolean;
}) {
  const [name, setName] = useState(room.roomNumber);
  const [confirmDel, setConfirmDel] = useState(false);
  const dirty = name.trim() !== room.roomNumber && name.trim().length > 0;
  const cfg = roomStatusConfig[room.status];

  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${dark ? "bg-white/[0.02]" : "bg-white"}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} title={cfg.label} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={`flex-1 px-2 py-1 rounded-md text-sm bg-transparent focus:outline-none ${dark ? "focus:bg-white/[0.04]" : "focus:bg-gray-100"} ${s.textPrimary}`}
      />
      {dirty && (
        <form action={renameAction}>
          <input type="hidden" name="id" value={room.id} />
          <input type="hidden" name="name" value={name.trim()} />
          <button type="submit" className="px-2 py-1 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
            Save
          </button>
        </form>
      )}
      {!confirmDel ? (
        <button type="button" onClick={() => setConfirmDel(true)} className={`p-1.5 rounded-md ${s.hoverBg}`} title="Delete room">
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      ) : (
        <form action={delAction} className="flex items-center gap-1">
          <input type="hidden" name="id" value={room.id} />
          <button type="button" onClick={() => setConfirmDel(false)} className={`px-2 py-1 rounded-md text-[10px] font-medium ${s.hoverBg} ${s.textSecondary}`}>
            Cancel
          </button>
          <button type="submit" className="px-2 py-1 rounded-md text-[10px] font-bold text-white bg-red-600 hover:bg-red-700">
            Delete
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Create/Edit Room Type Modal ───────────────────────

function RoomTypeModal({
  onClose, editType, editRooms, dark, s,
}: {
  onClose: () => void;
  editType: RoomType | null;
  /** When editing, the actual rooms of this type so we can rename / delete inline. */
  editRooms: Room[];
  dark: boolean;
  s: ReturnType<typeof getAdminStyles>;
}) {
  const action = editType ? updateRoomType : createRoomType;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const [imageUrl, setImageUrl] = useState<string>(editType?.image ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(editType?.amenities ?? []);
  // Default room numbers for create mode — sensible starter that admin overrides.
  const [roomNames, setRoomNames] = useState<string>(
    editType ? "" : "101\n102\n103\n104\n105\n106"
  );

  // Auto-close on success after a short delay
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 800);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`;
  const newRoomCount = roomNames.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Flex-wrapper centering — framer-motion writes an inline `transform`,
          which silently kills Tailwind -translate-x/y-1/2 centering and left
          the panel's lower half (incl. the submit button) off-screen. */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-lg ${s.cardBg} rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto`}
      >
        <div className={`p-6 border-b ${s.borderLight}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>{editType ? "Edit Room Type" : "Create Room Type"}</h2>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${s.hoverBg}`}><X className={`w-4 h-4 ${s.textSecondary}`} /></button>
          </div>
        </div>

        {state?.ok ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <h3 className={`font-bold ${s.textPrimary} mb-1`}>{editType ? "Updated!" : "Room Type Created!"}</h3>
            <p className={`text-sm ${s.textSecondary}`}>Saved to your database.</p>
          </motion.div>
        ) : (
          <form action={formAction} className="p-6 space-y-4">
            {editType && <input type="hidden" name="oldType" value={editType.id} />}
            {state && !state.ok && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <AlertCircle className="w-3.5 h-3.5" /> {state.error}
              </div>
            )}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Room Type Name</label>
              <input name="type" type="text" required defaultValue={editType?.name || ""} placeholder="e.g. Deluxe Room" className={inputCls} />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Description</label>
              <textarea name="description" defaultValue={editType?.description || ""} rows={3} placeholder="Describe the room…" className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Price Per Night ({CURRENCY_SYMBOL})</label>
              <div className="relative">
                <DollarSign className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.textMuted}`} />
                <input name="pricePerNight" type="number" required defaultValue={editType?.pricePerNight ?? ""} placeholder="45000" className={`${inputCls} pl-10`} />
              </div>
            </div>

            {/* Amenities checklist — replaces the old comma-separated input */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>
                Amenities <span className={s.textMuted}>· tick what's included</span>
              </label>
              <input type="hidden" name="amenities" value={amenities.join(", ")} />
              <AmenitiesPicker value={amenities} onChange={setAmenities} />
            </div>

            {/* Rooms — list editor with custom numbers */}
            {!editType ? (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>
                  Room numbers <span className={s.textMuted}>· one per line</span>
                </label>
                <textarea
                  name="roomNames"
                  rows={6}
                  value={roomNames}
                  onChange={(e) => setRoomNames(e.target.value)}
                  placeholder={"101\n102\n103\n101A\nPenthouse"}
                  className={`${inputCls} resize-y font-mono text-sm`}
                />
                <p className={`text-[11px] mt-1.5 ${s.textMuted}`}>
                  {newRoomCount} room{newRoomCount === 1 ? "" : "s"} will be created · use any label your hotel uses (101, 12B, "Penthouse Suite", …)
                </p>
              </div>
            ) : (
              <RoomsEditor type={editType.name} rooms={editRooms} s={s} dark={dark} />
            )}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${s.textLabel}`}>Room Image</label>
              <input type="hidden" name="image" value={imageUrl} />
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgb(229 231 235)" }}>
                  <img src={imageUrl} alt="Room cover" className="w-full h-40 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button type="button" onClick={() => setPickerOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-900 bg-white/95 hover:bg-white shadow">
                      Change
                    </button>
                    <button type="button" onClick={() => setImageUrl("")}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-white bg-red-600/90 hover:bg-red-600 shadow">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setPickerOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed text-sm font-medium ${dark ? "border-white/[0.08] text-gray-500 hover:border-white/[0.15] hover:text-gray-400" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"} transition-colors`}>
                  <ImageIcon className="w-4 h-4" />
                  Choose from media library or upload
                </button>
              )}
            </div>
            <button type="submit" disabled={pending} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60" style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}>
              <Save className="w-4 h-4" />
              {pending ? "Saving…" : (editType ? "Update Room Type" : "Create Room Type")}
            </button>
          </form>
        )}
      </motion.div>
      </div>

      {pickerOpen && (
        <ImagePickerModal
          initialUrl={imageUrl}
          onPick={(url) => setImageUrl(url)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function DeleteRoomTypeButton({ type, onDeleted, s }: { type: string; onDeleted: () => void; s: ReturnType<typeof getAdminStyles> }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(deleteRoomType, null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      onDeleted();
    }
  }, [state, onDeleted]);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className={`p-2 rounded-lg ${s.hoverBg}`} title="Delete room type">
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    );
  }
  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="type" value={type} />
      {state && !state.ok && <span className="text-[10px] text-red-500 font-semibold pr-1">{state.error}</span>}
      <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
        {pending ? "Deleting…" : "Delete all"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={`px-2 py-1.5 rounded-lg text-[11px] font-medium ${s.hoverBg} ${s.textSecondary}`}>Cancel</button>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────

function RoomsContent({ roomTypes, rooms }: { roomTypes: RoomType[]; rooms: Room[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [selectedType, setSelectedType] = useState<RoomType | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<"cards" | "plan">("cards");
  const [editType, setEditType] = useState<RoomType | null>(null);

  const totalRooms = roomTypes.reduce((a, t) => a + t.totalRooms, 0);
  const totalOccupied = roomTypes.reduce((a, t) => a + t.occupied, 0);
  const totalAvailable = totalRooms - totalOccupied;

  const selectedRooms = selectedType ? rooms.filter((r) => r.roomTypeId === selectedType.id) : [];

  return (
    <>
      <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Room Management</h1>
            <p className={`text-sm mt-1 ${s.textSecondary}`}>Manage room types, inventory, and availability.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className={`inline-flex items-center gap-1 p-1 rounded-xl border ${s.cardBorder} ${s.cardBg}`}>
              {[
                { id: "cards", label: "Cards", icon: LayoutGrid },
                { id: "plan",  label: "Floor plan", icon: MapIcon },
              ].map((v) => {
                const Icon = v.icon;
                const active = view === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id as "cards" | "plan")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      active ? "text-white shadow-sm" : `${s.textSecondary} ${s.hoverBg}`
                    }`}
                    style={active ? { background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" /> {v.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setEditType(null); setShowCreate(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
            >
              <Plus className="w-4 h-4" /> Add Room Type
            </button>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Rooms", value: totalRooms, color: "text-blue-500", icon: BedDouble },
            { label: "Occupied", value: totalOccupied, color: "text-green-500", icon: Users },
            { label: "Available", value: totalAvailable, color: "text-amber-500", icon: Check },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                  <div className={stat.color}><Icon className="w-5 h-5" /></div>
                </div>
                <div>
                  <p className={`text-xl font-bold ${s.textPrimary}`}>{stat.value}</p>
                  <p className={`text-xs ${s.textMuted}`}>{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Body — switches between cards (room types) and architectural floor plan */}
        {view === "cards" ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-semibold ${s.textSecondary}`}>Room types ({roomTypes.length})</h2>
              <p className={`text-[11px] ${s.textMuted}`}>Click a card to view rooms · edit · delete</p>
            </div>
            {roomTypes.length === 0 ? (
              <div className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-12 text-center`}>
                <BedDouble className={`w-10 h-10 mx-auto mb-3 ${s.textMuted}`} />
                <p className={`text-sm font-medium ${s.textSecondary}`}>No room types yet</p>
                <p className={`text-xs ${s.textMuted} mt-1`}>Click "Add Room Type" to seed your inventory.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomTypes.map((rt) => (
                  <RoomTypeCard
                    key={rt.id}
                    roomType={rt}
                    rooms={rooms.filter((r) => r.roomTypeId === rt.id)}
                    isSelected={selectedType?.id === rt.id}
                    onSelect={() => setSelectedType(rt)}
                    dark={dark}
                    s={s}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <FloorPlan rooms={rooms} roomTypes={roomTypes} />
        )}
      </div>

      {/* Drawer — per-type detail + actions */}
      <AdminDrawer
        open={selectedType !== null}
        onClose={() => setSelectedType(null)}
        title={selectedType?.name ?? ""}
        subtitle={selectedType ? `${CURRENCY_SYMBOL}${selectedType.pricePerNight.toLocaleString()}/night · ${selectedType.totalRooms} room${selectedType.totalRooms === 1 ? "" : "s"}` : undefined}
        avatar={selectedType?.image && (
          <img src={selectedType.image} alt={selectedType.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 shadow-sm" />
        )}
        actions={selectedType && (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditType(selectedType); setShowCreate(true); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
            >
              <Edit2 className="w-4 h-4" /> Edit room type
            </button>
            <DeleteRoomTypeButton type={selectedType.id} s={s} onDeleted={() => setSelectedType(null)} />
          </div>
        )}
      >
        {selectedType && (
          <>
            {/* Description */}
            {selectedType.description && (
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Description</p>
                <p className={`text-sm leading-relaxed ${s.textSecondary} ${s.sectionBg} rounded-xl p-3`}>{selectedType.description}</p>
              </div>
            )}

            {/* Amenities */}
            {selectedType.amenities.length > 0 && (
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedType.amenities.map((a) => (
                    <span key={a} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Room legend */}
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Status overview</p>
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${s.sectionBg} rounded-xl p-3`}>
                {Object.entries(roomStatusConfig).map(([key, cfg]) => {
                  const count = selectedRooms.filter((r) => r.status === key).length;
                  return (
                    <div key={key} className="text-center">
                      <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                      <div className={`flex items-center justify-center gap-1 mt-0.5 text-[10px] font-medium ${s.textMuted}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual rooms */}
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${s.textMuted}`}>Rooms ({selectedRooms.length})</p>
              {selectedRooms.length === 0 ? (
                <div className="text-center py-8">
                  <BedDouble className={`w-8 h-8 mx-auto mb-3 ${s.textMuted}`} />
                  <p className={`text-sm ${s.textMuted}`}>No rooms.</p>
                </div>
              ) : (
                <RoomGrid rooms={selectedRooms} dark={dark} s={s} />
              )}
            </div>
          </>
        )}
      </AdminDrawer>

      <AnimatePresence>
        {showCreate && (
          <RoomTypeModal
            onClose={() => setShowCreate(false)}
            editType={editType}
            editRooms={editType ? rooms.filter((r) => r.roomTypeId === editType.id) : []}
            dark={dark}
            s={s}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function RoomsView({
  roomTypes, rooms, config, counts,
}: { roomTypes: RoomType[]; rooms: Room[]; config: SiteConfig; counts?: { bookings: number; inquiries: number } }) {
  return <AdminShell config={config} counts={counts}><RoomsContent roomTypes={roomTypes} rooms={rooms} /></AdminShell>;
}
