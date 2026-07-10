"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import BookingDrawer, { Room, BookingDraft } from "./BookingDrawer";

/**
 * BookingDrawerProvider — wraps the App so any "Reserve" / "Book" button
 * on any page can open the drawer without prop-drilling.
 *
 * Usage in app/layout.tsx (Next.js 16 App Router):
 *
 *   <BookingDrawerProvider rooms={siteConfig.rooms}>
 *     {children}
 *   </BookingDrawerProvider>
 *
 * No `onConfirm` needed for the default flow — BookingDrawer posts to the
 * /api/reservations route the skill ships and redirects to the
 * /booking-confirmation page on success. Provide `onConfirm` only when
 * a payment provider (Paystack/Stripe) handles the redirect.
 *
 * Usage in any component (Hero, Header, RoomCard, etc.):
 *
 *   import { useBookingDrawer } from "@/components/booking/BookingDrawerProvider";
 *
 *   const { open } = useBookingDrawer();
 *
 *   <button onClick={() => open("heritage-king")}>Reserve</button>
 *
 * The slug parameter is optional — if omitted, the drawer opens with the
 * first room as default. Useful when a specific room card triggers it.
 */

type BookingDrawerContextType = {
  open: (defaultRoomSlug?: string) => void;
  close: () => void;
  isOpen: boolean;
};

const BookingDrawerContext = createContext<BookingDrawerContextType | null>(null);

export function useBookingDrawer(): BookingDrawerContextType {
  const ctx = useContext(BookingDrawerContext);
  if (!ctx) {
    throw new Error("useBookingDrawer must be used inside <BookingDrawerProvider>");
  }
  return ctx;
}

type ProviderProps = {
  children: ReactNode;
  rooms: Room[];
  locationName?: string;
  depositPercent?: number;
  paymentProvider?: "paystack" | "stripe" | "flutterwave";
  onConfirm?: (booking: BookingDraft) => Promise<void>;
};

export default function BookingDrawerProvider({
  children,
  rooms,
  locationName,
  depositPercent,
  paymentProvider,
  onConfirm,
}: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultSlug, setDefaultSlug] = useState<string | undefined>();
  
  const open = useCallback((slug?: string) => {
    setDefaultSlug(slug);
    setIsOpen(true);
  }, []);
  
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  return (
    <BookingDrawerContext.Provider value={{ open, close, isOpen }}>
      {children}
      <BookingDrawer
        open={isOpen}
        onClose={close}
        rooms={rooms}
        defaultRoomSlug={defaultSlug}
        locationName={locationName}
        depositPercent={depositPercent}
        paymentProvider={paymentProvider}
        onConfirm={onConfirm}
      />
    </BookingDrawerContext.Provider>
  );
}
