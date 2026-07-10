"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/content/site-config";
import { NAV_LINKS } from "./nav-links";
import { useScrollState } from "./hooks";

/**
 * Header #6 — FULLSCREEN OVERLAY MENU
 * Just "Menu" label top-right. Click → fullscreen overlay with huge
 * typographic nav links, animated reveal (resn.co.nz / active-theory style).
 *
 * Best for: fashion, creative agencies, portfolio sites, art brands
 */
export default function HeaderFullscreenOverlay() {
  const scrolled = useScrollState(40);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
          scrolled && !open ? "bg-bg/60 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-6 md:px-10 py-5 md:py-6">
          <Link
            href="/"
            className="font-display font-bold tracking-[0.2em] uppercase text-xs md:text-sm text-white"
          >
            {siteConfig.company.name}
          </Link>

          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="group flex items-center gap-3 font-mono text-[11px] md:text-xs uppercase tracking-[0.3em] text-white hover:text-primary transition-colors"
          >
            <div className="flex flex-col gap-1.5">
              <div className="w-6 h-[1px] bg-current" />
              <div className="w-4 h-[1px] bg-current transition-all group-hover:w-6" />
            </div>
            <span>Menu</span>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && <FullscreenMenu onClose={() => setOpen(false)} pathname={pathname} />}
      </AnimatePresence>
    </>
  );
}

function FullscreenMenu({
  onClose,
  pathname,
}: {
  onClose: () => void;
  pathname: string;
}) {
  return (
    <motion.div
      initial={{ clipPath: "circle(0% at 90% 0%)" }}
      animate={{ clipPath: "circle(150% at 90% 0%)" }}
      exit={{ clipPath: "circle(0% at 90% 0%)" }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-50 bg-bg overflow-hidden"
    >
      {/* Close button */}
      <div className="flex items-center justify-between px-6 md:px-10 py-5 md:py-6">
        <span className="font-display font-bold tracking-[0.2em] uppercase text-xs md:text-sm text-white">
          {siteConfig.company.name}
        </span>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="flex items-center gap-3 font-mono text-[11px] md:text-xs uppercase tracking-[0.3em] text-white hover:text-primary transition-colors"
        >
          <div className="relative w-6 h-6">
            <div className="absolute top-1/2 left-0 w-6 h-[1px] bg-current rotate-45" />
            <div className="absolute top-1/2 left-0 w-6 h-[1px] bg-current -rotate-45" />
          </div>
          <span>Close</span>
        </button>
      </div>

      {/* Huge nav */}
      <nav className="flex items-center justify-center h-[calc(100vh-120px)] px-6 md:px-10">
        <ul className="flex flex-col gap-2 md:gap-4 text-center">
          {NAV_LINKS.map((link, i) => {
            const active = pathname === link.href;
            return (
              <motion.li
                key={link.href}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{
                  delay: 0.3 + i * 0.08,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={`group block font-display font-light text-6xl md:text-8xl lg:text-9xl leading-[1.0] tracking-tight transition-all ${
                    active ? "text-primary italic" : "text-white hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-0 inset-x-0 p-6 md:p-10 flex flex-col md:flex-row gap-4 md:gap-10 justify-between font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/50"
      >
        <div>{siteConfig.company.email}</div>
        <div>{siteConfig.company.location}</div>
        <div>© {new Date().getFullYear()}</div>
      </motion.div>
    </motion.div>
  );
}
