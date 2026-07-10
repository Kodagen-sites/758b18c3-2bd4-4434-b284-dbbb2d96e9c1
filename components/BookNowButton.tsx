"use client";

import { useBookingTrigger } from "@/components/booking/BookingFlow";
import MagneticButton from "@/components/motion/MagneticButton";

type Props = {
  label?: string;
  slug?: string;
  className?: string;
  variant?: "solid" | "outline";
};

const SOLID =
  "min-h-[48px] px-8 py-3.5 rounded-full bg-primary text-ink font-display font-medium text-sm hover:brightness-110 transition-all inline-flex items-center justify-center";
const OUTLINE =
  "min-h-[48px] px-8 py-3.5 rounded-full border border-cream/25 bg-cream/5 text-cream font-display font-medium text-sm backdrop-blur-md hover:bg-cream/10 transition-all inline-flex items-center justify-center";

export default function BookNowButton({
  label = "Book a Visit",
  slug,
  className,
  variant = "solid",
}: Props) {
  const { open } = useBookingTrigger();
  return (
    <MagneticButton
      as="button"
      onClick={() => open(slug)}
      className={className ?? (variant === "solid" ? SOLID : OUTLINE)}
    >
      {label}
    </MagneticButton>
  );
}
