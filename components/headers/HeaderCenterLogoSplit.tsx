"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/content/site-config";
import { NAV_LINKS } from "./nav-links";
import { useIsMobile, useScrollState } from "./hooks";

/**
 * Header #19 — CENTER LOGO + SPLIT NAV
 * Logo dead-center at top, nav items split symmetrically:
 * (Services  Work)   LOGO   (About  Contact)
 * Vintage-meets-modern, hospitality / fashion vibe.
 *
 * Best for: hospitality, restaurants, fashion, wedding/event, boutique hotels
 */
export default function HeaderCenterLogoSplit() {
  const scrolled = useScrollState(40);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const leftLinks = NAV_LINKS.slice(1, 3);  // Services, Work
  const rightLinks = NAV_LINKS.slice(3);    // About, Contact

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
          scrolled
            ? "bg-bg/90 backdrop-blur-xl border-b border-white/10 py-3 md:py-4"
            : "bg-transparent py-5 md:py-7"
        }`}
      >
        <div className="relative flex items-center justify-between px-6 md:px-10">
          {/* Left nav (desktop) or burger (mobile) */}
          {!isMobile ? (
            <nav className="flex gap-8 flex-1">
              {leftLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative font-mono text-[11px] uppercase tracking-[0.3em] transition-colors ${
                      active ? "text-primary" : "text-white/80 hover:text-white"
                    }`}
                  >
                    {link.label}
                    {active && (
                      <motion.span
                        layoutId="centersplit-underline"
                        className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="text-white flex-1 text-left"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Center logo */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 text-white group"
          >
            <span className="font-display font-bold tracking-[0.3em] uppercase text-sm md:text-base lg:text-lg group-hover:tracking-[0.35em] transition-all duration-500">
              {siteConfig.company.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 md:w-3 h-[1px] bg-white/30" />
              <span className="font-mono text-[8px] md:text-[9px] tracking-[0.4em] uppercase text-white/50">
                est. {new Date().getFullYear()}
              </span>
              <span className="w-2 md:w-3 h-[1px] bg-white/30" />
            </div>
          </Link>

          {/* Right nav (desktop) or empty (mobile) */}
          {!isMobile ? (
            <nav className="flex gap-8 flex-1 justify-end">
              {rightLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative font-mono text-[11px] uppercase tracking-[0.3em] transition-colors ${
                      active ? "text-primary" : "text-white/80 hover:text-white"
                    }`}
                  >
                    {link.label}
                    {active && (
                      <motion.span
                        layoutId="centersplit-underline"
                        className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && <MobileOverlay onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function MobileOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-bg md:hidden"
    >
      <div className="relative flex items-center justify-between p-6">
        <button onClick={onClose} className="text-white" aria-label="Close menu">
          <X size={22} />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 font-display font-bold tracking-[0.3em] uppercase text-sm text-white">
          {siteConfig.company.name}
        </div>
        <div className="w-6" />
      </div>
      <ul className="flex flex-col gap-6 p-6 items-center text-center mt-8">
        {NAV_LINKS.map((link, i) => (
          <motion.li
            key={link.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
          >
            <Link
              href={link.href}
              onClick={onClose}
              className="font-display text-3xl text-white hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
