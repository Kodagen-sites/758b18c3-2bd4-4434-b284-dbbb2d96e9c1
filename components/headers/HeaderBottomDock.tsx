"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Folder, User, Mail, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/content/site-config";
import { useIsMobile } from "./hooks";

/**
 * Header #8 — BOTTOM DOCK
 * Nav sits at BOTTOM of viewport in a floating rounded pill, macOS dock style.
 * Stays pinned. Home page also shows a minimal top logo.
 *
 * Best for: interactive experiences, games, creative tools, generative art
 */
const DOCK_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/services", label: "Services", icon: Briefcase },
  { href: "/work", label: "Work", icon: Folder },
  { href: "/about", label: "About", icon: User },
  { href: "/contact", label: "Contact", icon: Mail },
] as const;

export default function HeaderBottomDock() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Top logo - minimal */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-6 md:px-10 py-5"
      >
        <Link
          href="/"
          className="font-display font-bold tracking-[0.2em] uppercase text-xs md:text-sm text-white"
        >
          {siteConfig.company.name}
        </Link>

        {isMobile && (
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="text-white"
          >
            <Menu size={22} />
          </button>
        )}
      </motion.header>

      {/* Bottom dock (desktop) */}
      {!isMobile && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full backdrop-blur-2xl bg-white/8 border border-white/15 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]">
            {DOCK_LINKS.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative flex items-center gap-2 px-3 py-2 rounded-full transition-all"
                  title={link.label}
                >
                  {active && (
                    <motion.span
                      layoutId="dock-active"
                      className="absolute inset-0 bg-primary/20 rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={18}
                    className={`relative transition-colors ${
                      active ? "text-primary" : "text-white/80 group-hover:text-white"
                    }`}
                  />
                  <span
                    className={`relative font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${
                      active
                        ? "text-primary"
                        : "text-white/0 group-hover:text-white/80"
                    }`}
                    style={{
                      maxWidth: active ? 100 : 0,
                      overflow: "hidden",
                      transition: "max-width 300ms ease, color 200ms ease",
                    }}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}

            <div className="w-px h-6 bg-white/15 mx-1" />

            <Link
              href="/contact"
              className="px-4 py-2 rounded-full bg-primary text-bg text-xs font-display font-medium hover:brightness-110 transition-all"
            >
              Start
            </Link>
          </div>
        </motion.div>
      )}

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
        <div className="font-display font-bold tracking-[0.2em] uppercase text-sm text-white">
          {siteConfig.company.name}
        </div>
        <button onClick={onClose} className="text-white" aria-label="Close menu">
          <X size={22} />
        </button>
      </div>
      <ul className="flex flex-col gap-6 p-6">
        {DOCK_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onClose}
              className="font-display text-3xl text-white hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
