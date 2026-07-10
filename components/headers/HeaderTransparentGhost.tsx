"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/content/site-config";
import { NAV_LINKS } from "./nav-links";
import { useScrollState } from "./hooks";

/**
 * Header #5 — TRANSPARENT GHOST
 * No visible header at top of page. Just a tiny logo top-left + single CTA
 * top-right, both blend with hero. Appears with backdrop on scroll.
 *
 * Best for: hospitality, restaurants, luxury, storytelling brands
 */
export default function HeaderTransparentGhost() {
  const scrolled = useScrollState(60);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
          scrolled || !isHome
            ? "bg-bg/80 backdrop-blur-xl border-b border-white/5"
            : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-6 md:px-10 py-5 md:py-6">
          <Link
            href="/"
            className="font-display font-bold tracking-[0.2em] uppercase text-[11px] md:text-xs text-white mix-blend-difference"
          >
            {siteConfig.company.name}
          </Link>

          {scrolled || !isHome ? (
            <nav className="hidden md:flex gap-8 font-mono text-[11px] uppercase tracking-[0.25em] text-white/80">
              {NAV_LINKS.slice(1).map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors ${
                      active ? "text-primary" : "hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <div className="flex items-center gap-4">
            <Link
              href="/contact"
              className="hidden md:inline-flex font-display text-xs uppercase tracking-[0.2em] text-white border-b border-white/30 hover:border-primary hover:text-primary transition-colors pb-0.5 mix-blend-difference"
            >
              Start →
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden text-white mix-blend-difference"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
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
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-bg md:hidden"
    >
      <div className="flex items-center justify-between p-6">
        <div className="font-display font-bold tracking-[0.2em] uppercase text-xs text-white">
          {siteConfig.company.name}
        </div>
        <button onClick={onClose} className="text-white" aria-label="Close menu">
          <X size={22} />
        </button>
      </div>
      <ul className="flex flex-col gap-6 p-6">
        {NAV_LINKS.map((link, i) => (
          <motion.li
            key={link.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
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
