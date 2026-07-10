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
 * Header #2 — SPLIT EDGES
 * No connecting bar. Logo in top-left corner, nav/CTA in top-right corner,
 * empty space between. Ultra-wide editorial feel.
 *
 * Best for: fashion, editorial, architecture, luxury, high-end consumer
 */
export default function HeaderSplitEdges() {
  const scrolled = useScrollState(40);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed inset-x-0 top-0 z-40 pointer-events-none transition-all duration-500 ${
          scrolled ? "bg-bg/60 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="flex items-start justify-between p-6 md:p-8 pointer-events-auto">
          {/* Far left: logo stack */}
          <Link
            href="/"
            className="group flex flex-col gap-1 text-white hover:text-primary transition-colors"
          >
            <span className="font-display font-bold tracking-[0.2em] uppercase text-sm md:text-base">
              {siteConfig.company.name}
            </span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-white/50 uppercase">
              est. {new Date().getFullYear()}
            </span>
          </Link>

          {/* Far right: nav + CTA (desktop) */}
          {!isMobile ? (
            <div className="flex items-start gap-10">
              <nav className="flex flex-col items-end gap-1">
                {NAV_LINKS.slice(1).map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`font-mono text-[11px] uppercase tracking-[0.25em] transition-colors ${
                        active ? "text-primary" : "text-white/80 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <Link
                href="/contact"
                className="font-display text-xs uppercase tracking-[0.2em] text-white border-b border-white/30 hover:border-primary hover:text-primary transition-colors pb-1"
              >
                Start →
              </Link>
            </div>
          ) : (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="text-white"
            >
              <Menu size={22} />
            </button>
          )}
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <MobileFullscreen onClose={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function MobileFullscreen({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ clipPath: "inset(0 0 100% 0)" }}
      animate={{ clipPath: "inset(0 0 0 0)" }}
      exit={{ clipPath: "inset(0 0 100% 0)" }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-50 bg-bg md:hidden"
    >
      <div className="flex items-center justify-between p-6">
        <div className="font-display font-bold tracking-[0.2em] uppercase text-sm text-white">
          {siteConfig.company.name}
        </div>
        <button onClick={onClose} className="text-white" aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      <ul className="flex flex-col gap-4 p-6 mt-8">
        {NAV_LINKS.map((link, i) => (
          <motion.li
            key={link.href}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
          >
            <Link
              href={link.href}
              onClick={onClose}
              className="font-display text-4xl text-white hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
