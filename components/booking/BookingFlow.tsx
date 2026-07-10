"use client";

/**
 * BookingFlow — router that selects the correct booking variant based on
 * siteConfig.bookingVariant. Same pattern as Header.tsx in templates/shared/
 * headers/: import one component, switch the variant in site-config without
 * touching imports anywhere else.
 *
 * Usage in app/layout.tsx:
 *
 *   import BookingFlow from "@/components/booking/BookingFlow";
 *
 *   <body>
 *     <BookingFlow rooms={siteConfig.rooms} />
 *     {children}
 *   </body>
 *
 * Then for variants that need a trigger hook (B1 drawer, B3 modal), use:
 *   const { open } = useBookingTrigger();
 *   <button onClick={() => open()}>Reserve</button>
 *
 * B2 (inline) and B4 (sticky bar) don't need a trigger — they're always on
 * the page. For B2, drop <BookingInline /> directly into the hero section.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { siteConfig } from "@/content/site-config";
import BookingDrawer, { type Room, type BookingDraft, type BookingMode } from "./BookingDrawer";
import BookingModal from "./BookingModal";
import BookingInline from "./BookingInline";
import BookingStickyBar from "./BookingStickyBar";

export type BookingVariant = "B1" | "B2" | "B3" | "B4";

interface BookingTriggerContextType {
  open: (defaultRoomSlug?: string) => void;
  close: () => void;
  isOpen: boolean;
}

const BookingTriggerContext = createContext<BookingTriggerContextType | null>(null);

export function useBookingTrigger(): BookingTriggerContextType {
  const ctx = useContext(BookingTriggerContext);
  if (ctx) return ctx;
  // For B2 + B4 (no overlay), provide a no-op so call sites don't blow up.
  return {
    open: () => { /* no-op for inline/sticky variants */ },
    close: () => { /* no-op */ },
    isOpen: false,
  };
}

interface BookingFlowProps {
  children?: ReactNode;
  rooms?: Room[];
  locationName?: string;
  depositPercent?: number;
  onConfirm?: (booking: BookingDraft) => Promise<void>;
  mode?: BookingMode;      // "stay" | "appointment"; omit → inferred from rooms
  dayStart?: string;       // appointment mode: first bookable slot, "HH:mm"
  dayEnd?: string;         // appointment mode: sessions must end by this
  slotMinutes?: number;    // appointment mode: session length
}

export default function BookingFlow({
  children,
  rooms,
  locationName,
  depositPercent,
  onConfirm,
  mode,
  dayStart,
  dayEnd,
  slotMinutes,
}: BookingFlowProps) {
  const variant = (siteConfig as { bookingVariant?: BookingVariant }).bookingVariant ?? "B1";
  const roomList = rooms ?? (siteConfig as { rooms?: Room[] }).rooms ?? [];

  const [isOpen, setIsOpen] = useState(false);
  const [defaultSlug, setDefaultSlug] = useState<string | undefined>();

  const open = useCallback((slug?: string) => {
    setDefaultSlug(slug);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  // B2 (inline) and B4 (sticky bar) render directly — no trigger context needed.
  if (variant === "B2") {
    return <>{children}<BookingInline /></>;
  }
  if (variant === "B4") {
    return <>{children}<BookingStickyBar /></>;
  }

  // B1 + B3 need the trigger context so any button can call open()
  return (
    <BookingTriggerContext.Provider value={{ open, close, isOpen }}>
      {children}
      {variant === "B3" ? (
        <BookingModal
          open={isOpen}
          onClose={close}
          rooms={roomList}
          defaultRoomSlug={defaultSlug}
          locationName={locationName}
          onConfirm={onConfirm}
          mode={mode}
          dayStart={dayStart}
          dayEnd={dayEnd}
          slotMinutes={slotMinutes}
        />
      ) : (
        <BookingDrawer
          open={isOpen}
          onClose={close}
          rooms={roomList}
          defaultRoomSlug={defaultSlug}
          locationName={locationName}
          depositPercent={depositPercent}
          onConfirm={onConfirm}
          mode={mode}
          dayStart={dayStart}
          dayEnd={dayEnd}
          slotMinutes={slotMinutes}
        />
      )}
    </BookingTriggerContext.Provider>
  );
}
