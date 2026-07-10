"use client";

import { ReactNode } from "react";

/**
 * Section with a sticky left column (heading/description) and a scrollable
 * right column (cards/steps/features). The left stays fixed while the user
 * reads through the right.
 *
 * Best used for: services breakdown, process steps, "how it works" sections.
 *
 * Usage:
 *   <StickyScrollSection
 *     sticky={<><h2>Our process</h2><p>...</p></>}
 *     scrolling={steps.map(step => <StepCard ... />)}
 *   />
 *
 * On mobile, degrades gracefully to a vertical stack (sticky disabled).
 */
type Props = {
  sticky: ReactNode;
  scrolling: ReactNode;
  className?: string;
  stickyOffset?: string; // tailwind top-* value, default "top-24"
};

export default function StickyScrollSection({
  sticky,
  scrolling,
  className = "",
  stickyOffset = "top-24",
}: Props) {
  return (
    <section className={`relative ${className}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-10 md:gap-16">
        {/* Sticky column */}
        <div className={`relative md:sticky ${stickyOffset} md:h-fit`}>
          {sticky}
        </div>

        {/* Scrolling column */}
        <div className="flex flex-col gap-6 md:gap-8">
          {scrolling}
        </div>
      </div>
    </section>
  );
}
