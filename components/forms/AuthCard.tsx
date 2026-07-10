"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

/**
 * AuthCard — premium wrapper for login / signup / forgot-password pages.
 *
 * Replaces the basic centered-form pattern with:
 * - Branded eyebrow label + display heading + supporting copy
 * - Subtle entrance animation
 * - Side ornament (optional brand-themed divider)
 * - Footer slot for "forgot password" / "already a member" cross-links
 * - Optional left panel for brand storytelling (split layout)
 *
 * Used by /account/login, /account/signup, /account/forgot-password,
 * /account/reset-password.
 *
 * Rule 33.4 compliance: when V1 voice or premium industry, login pages
 * use this card instead of stacked plain inputs.
 */

type Props = {
  eyebrow?: string;          // e.g. "HERITAGE CIRCLE"
  heading: string;            // e.g. "Welcome back."
  subheading?: string;        // e.g. "Sign in to see your loyalty status."
  children: ReactNode;        // form content (use AnimatedInput inside)
  footerLeft?: ReactNode;     // e.g. "Forgot password" link
  footerRight?: ReactNode;    // e.g. "Become a member" link
  splitImage?: string;        // optional URL for left brand panel
  splitGradient?: string;     // fallback gradient for left panel
};

export default function AuthCard({
  eyebrow,
  heading,
  subheading,
  children,
  footerLeft,
  footerRight,
  splitImage,
  splitGradient,
}: Props) {
  const hasSplit = !!(splitImage || splitGradient);
  
  return (
    <div className={`min-h-screen flex ${hasSplit ? "" : "items-center justify-center"}`}>
      {/* Optional brand storytelling panel (desktop only) */}
      {hasSplit && (
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block lg:w-1/2 relative overflow-hidden"
          style={{
            backgroundImage: splitImage ? `url(${splitImage})` : splitGradient,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-bg/40 via-bg/20 to-bg/60" />
        </motion.aside>
      )}
      
      {/* Form panel */}
      <div className={`flex items-center justify-center px-6 py-12 ${hasSplit ? "lg:w-1/2 w-full" : "w-full"}`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-md"
        >
          {/* Header */}
          {eyebrow && (
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-4">
              {eyebrow}
            </p>
          )}
          
          <h1 className="font-display text-3xl md:text-4xl leading-tight text-text-primary mb-3">
            {heading}
          </h1>
          
          {subheading && (
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              {subheading}
            </p>
          )}
          
          {/* Form body */}
          <div className="space-y-4">{children}</div>
          
          {/* Footer */}
          {(footerLeft || footerRight) && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30 text-sm">
              <div>{footerLeft}</div>
              <div>{footerRight}</div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * AuthLink — styled cross-link for AuthCard footer.
 */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      href={to}
      className="text-primary hover:underline underline-offset-4 transition-colors font-mono text-xs tracking-wider uppercase"
    >
      {children}
    </Link>
  );
}
