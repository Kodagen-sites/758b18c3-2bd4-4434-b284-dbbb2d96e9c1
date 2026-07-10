"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, Search, ArrowRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/content/site-config";
import { NAV_LINKS } from "./nav-links";
import { useIsMobile, useScrollState } from "./hooks";

/**
 * Header #20 — FLOATING COMMAND BAR
 * Pill at top with Spotlight / Linear Cmd+K aesthetic. Search icon,
 * compressed nav, pill-inset CTA, ⌘K hint. Feels like a modern dev tool.
 * Real Cmd+K opens a search-style navigation palette.
 *
 * Best for: dev tools, SaaS, productivity, modern software, launch tools
 */
export default function HeaderCommandBar() {
  const scrolled = useScrollState(20);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd+K opens the palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-4 md:top-5 inset-x-4 md:inset-x-0 z-40 flex justify-center pointer-events-none"
      >
        <div
          className={`pointer-events-auto flex items-center gap-1 md:gap-2 rounded-xl backdrop-blur-2xl transition-all duration-500 ${
            scrolled
              ? "bg-bg/85 border border-white/15 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
              : "bg-white/5 border border-white/10"
          }`}
          style={{ padding: "5px 5px 5px 12px" }}
        >
          <Link
            href="/"
            className="pr-3 py-1.5 font-display font-bold tracking-[0.12em] uppercase text-xs text-white flex items-center gap-2"
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, var(--primary-color), var(--accent-color))`,
              }}
            >
              <span className="text-bg font-bold text-[10px]">
                {siteConfig.company.name[0]}
              </span>
            </div>
            <span>{siteConfig.company.name}</span>
          </Link>

          {!isMobile && (
            <>
              <div className="w-px h-5 bg-white/10" />
              <nav className="flex items-center gap-0.5 mx-1">
                {NAV_LINKS.slice(1).map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-[0.15em] transition-colors ${
                        active ? "text-white" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="cmd-active"
                          className="absolute inset-0 bg-white/8 rounded-lg border border-white/15"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="w-px h-5 bg-white/10" />

              {/* Cmd+K palette trigger */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all"
              >
                <Search size={12} />
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase">
                  Search
                </span>
                <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/5 border border-white/10">
                  <Command size={9} />
                  <span className="font-mono text-[9px]">K</span>
                </div>
              </button>

              <Link
                href="/contact"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-bg text-xs font-display font-medium hover:brightness-110 transition-all group"
              >
                <span>Start</span>
                <ArrowRight
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </>
          )}

          {isMobile && (
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/10"
            >
              <Menu size={16} />
            </button>
          )}
        </div>
      </motion.header>

      <AnimatePresence>
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {menuOpen && <MobileOverlay onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = NAV_LINKS.filter((link) =>
    link.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-bg/95 backdrop-blur-2xl border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Search size={16} className="text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search navigation..."
            className="flex-1 bg-transparent text-white placeholder-white/30 font-mono text-sm outline-none"
          />
          <kbd className="text-white/40 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/40 font-mono text-xs">
              No results
            </div>
          ) : (
            filtered.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="font-mono text-[10px] text-white/60">
                      {link.label[0]}
                    </span>
                  </div>
                  <span className="font-display text-white">{link.label}</span>
                </div>
                <ArrowRight
                  size={14}
                  className="text-white/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 font-mono text-[10px] text-white/40">
          <span>Navigate quickly</span>
          <span>⌘K to toggle</span>
        </div>
      </motion.div>
    </motion.div>
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
        <div className="font-display font-bold tracking-[0.12em] uppercase text-sm text-white">
          {siteConfig.company.name}
        </div>
        <button onClick={onClose} className="text-white" aria-label="Close menu">
          <X size={22} />
        </button>
      </div>
      <ul className="flex flex-col gap-6 p-6">
        {NAV_LINKS.map((link) => (
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
