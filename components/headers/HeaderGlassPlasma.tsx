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
 * Header #15 — GLASS PLASMA CAPSULE
 * Like pill floating (#1) but with an ANIMATED PLASMA GRADIENT BORDER,
 * extra glass backdrop, glow shadow. Feels futuristic, AI-native, Web3.
 *
 * Best for: AI products, Web3, gaming, crypto, cyberpunk brands
 */
export default function HeaderGlassPlasma() {
  const scrolled = useScrollState(20);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-4 md:top-5 inset-x-4 md:inset-x-0 z-40 flex justify-center pointer-events-none"
      >
        {/* Outer plasma-border wrapper */}
        <div className="relative pointer-events-auto">
          {/* Animated plasma gradient border — conic gradient rotating */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-[1.5px] rounded-full opacity-80"
            style={{
              background: `conic-gradient(from 0deg, var(--primary-color), var(--accent-color), var(--primary-color), var(--accent-color), var(--primary-color))`,
              filter: "blur(4px)",
            }}
          />
          {/* Glow halo */}
          <div
            className="absolute -inset-3 rounded-full opacity-40 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, var(--primary-color) 0%, transparent 60%)`,
              filter: "blur(20px)",
            }}
          />

          {/* Actual pill content */}
          <div
            className={`relative flex items-center gap-1 md:gap-2 rounded-full backdrop-blur-3xl transition-all duration-500 ${
              scrolled
                ? "bg-bg/85 border border-white/20"
                : "bg-bg/60 border border-white/15"
            }`}
            style={{ padding: "6px 8px" }}
          >
            <Link
              href="/"
              className="px-3 md:px-4 py-2 font-display font-bold tracking-[0.12em] uppercase text-xs md:text-sm bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent"
            >
              {siteConfig.company.name}
            </Link>

            {!isMobile && (
              <nav className="flex items-center gap-1 mx-2">
                {NAV_LINKS.slice(1).map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-[0.15em] transition-colors ${
                        active ? "text-white" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="plasma-active"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, var(--primary-color)22, var(--accent-color)22)`,
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {!isMobile ? (
              <Link
                href="/contact"
                className="relative px-4 py-2 rounded-full text-xs font-display font-medium text-bg overflow-hidden group"
                style={{
                  background: `linear-gradient(90deg, var(--primary-color), var(--accent-color))`,
                }}
              >
                <span className="relative">Start →</span>
              </Link>
            ) : (
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10"
              >
                <Menu size={18} />
              </button>
            )}
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
      className="fixed inset-0 z-50 bg-bg md:hidden"
    >
      <div className="flex items-center justify-between p-6">
        <div className="font-display font-bold tracking-[0.12em] uppercase text-sm bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">
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
