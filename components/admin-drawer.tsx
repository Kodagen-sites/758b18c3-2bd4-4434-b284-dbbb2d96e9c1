"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";

/**
 * Right-side slide-over for detail + actions on bookings/inquiries/etc.
 * Pattern: list on the left/full-width, click a row → drawer opens with the
 * record header on top, body in the middle, sticky action footer at the bottom.
 *
 * `actions` is rendered inside a sticky footer so destructive buttons stay
 * visible even when the body scrolls.
 */
export default function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  avatar,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            className={`fixed right-0 top-0 bottom-0 z-[90] w-full sm:max-w-[460px] ${s.cardBg} shadow-2xl flex flex-col`}
          >
            {/* Header */}
            <header className={`flex items-start justify-between gap-3 p-5 border-b ${s.borderLight} flex-shrink-0`}>
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {avatar}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h2 className={`text-base font-bold truncate ${s.textPrimary}`}>{title}</h2>
                    {badge}
                  </div>
                  {subtitle && <p className={`text-xs ${s.textMuted} truncate`}>{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${s.hoverBg} flex-shrink-0`}
                aria-label="Close"
              >
                <X className={`w-4 h-4 ${s.textSecondary}`} />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>

            {/* Sticky action footer */}
            {actions && (
              <footer className={`p-4 border-t ${s.borderLight} flex-shrink-0 ${s.cardBg}`}>
                {actions}
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
