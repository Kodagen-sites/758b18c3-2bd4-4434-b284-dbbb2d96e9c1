import { Suspense } from "react";
import type { Metadata } from "next";
import BookingConfirmation from "./_confirmation";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  robots: { index: false, follow: false },
};

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <BookingConfirmation />
    </Suspense>
  );
}
