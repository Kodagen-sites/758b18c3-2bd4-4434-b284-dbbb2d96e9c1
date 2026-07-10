"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminLiveUpdates from "@/components/admin/admin-live-updates";
import { useRole } from "@/app/admin/role-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, ImageIcon, MessageSquare,
  Settings, CalendarCheck, Car, Building2,
  Menu, X, ChevronRight, ExternalLink, LogOut, Users, Plug,
  Search, Sun, Moon, BedDouble, Home, Star,
  Receipt, BarChart3, PartyPopper, QrCode, ShieldCheck,
  ShoppingBag, FolderTree, Package, Warehouse,
  Contact, Handshake, ClipboardList, FileCheck, Activity,
  Ticket, CalendarDays, UserCheck, LifeBuoy, ListTodo,
} from "lucide-react";
import { SiteConfig } from "@/lib/types";
import { getIndustryModule, getIndustryLabel } from "@/lib/admin-types";
import { AdminThemeProvider, useAdminTheme } from "@/lib/admin-theme";

const industryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  bookings: CalendarCheck,
  rentals: Car,
  appointments: CalendarCheck,
  catalog: Package,
  crm: Handshake,
  tickets: Ticket,
};

interface AdminShellProps {
  config: SiteConfig;
  /** Live counts shown as sidebar badges. Pass real numbers from the page's
   *  server fetch — omitted = no badge. */
  counts?: { bookings?: number; inquiries?: number };
  children: React.ReactNode;
}

function AdminShellInner({ config, counts, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle } = useAdminTheme();
  const pathname = usePathname();
  const industryMod = getIndustryModule(config);

  // Role + permissions from DB via the admin layout context
  const { role: userRole, permissions: userPermissions } = useRole();
  const IndustryIcon = industryIcons[industryMod];
  const dark = theme === "dark";

  const fmtBadge = (n: number | undefined) => (n && n > 0 ? String(n > 99 ? "99+" : n) : null);
  const bookingsBadge = fmtBadge(counts?.bookings);
  const inquiriesBadge = fmtBadge(counts?.inquiries);

  // Check if the current user has a specific permission
  const perms = userPermissions ?? [];
  const has = (p: string) => {
    // Owner/admin see everything
    if (userRole === "owner" || userRole === "admin" || !userRole) return true;
    return perms.includes(p);
  };

  type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; badge: string | null };
  const allNavSections: { label: string; items: (NavItem & { perm?: string })[] }[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard, badge: null, perm: "dashboard.view" },
      ],
    },
    {
      label: "Operations",
      items: [
        // Booking-engine industries (hotel bookings / rentals / appointments).
        // The list page is always /admin/bookings — only the label changes.
        // Rooms/Events/Security are hotel concerns and show ONLY for hotels;
        // a salon or clinic gets Appointments + Services + Inquiries.
        ...(industryMod === "bookings" || industryMod === "rentals" || industryMod === "appointments" ? [
          { label: getIndustryLabel(industryMod), href: "/admin/bookings", icon: IndustryIcon, badge: bookingsBadge, perm: "bookings.view" },
          ...(industryMod === "bookings" ? [
            { label: "Rooms", href: "/admin/rooms", icon: BedDouble, badge: null, perm: "rooms.view" },
            { label: "Events", href: "/admin/events", icon: PartyPopper, badge: null, perm: "events.view" },
            { label: "Security", href: "/admin/security", icon: ShieldCheck, badge: null, perm: "security.view" },
          ] : []),
          ...(industryMod === "rentals" ? [{ label: "Fleet", href: "/admin/rooms", icon: Car, badge: null, perm: "rooms.view" }] : []),
          ...(industryMod === "appointments" ? [{ label: "Services", href: "/admin/services", icon: ListTodo, badge: null, perm: "rooms.view" }] : []),
        ] : []),
        // Catalog-based industries
        ...(industryMod === "catalog" ? [
          { label: "Products", href: "/admin/products", icon: ShoppingBag, badge: null, perm: "products.view" },
          { label: "Categories", href: "/admin/categories", icon: FolderTree, badge: null, perm: "categories.view" },
          { label: "Orders", href: "/admin/orders", icon: Package, badge: bookingsBadge, perm: "orders.view" },
          { label: "Inventory", href: "/admin/inventory", icon: Warehouse, badge: null, perm: "inventory.view" },
        ] : []),
        // Tickets-based industries
        ...(industryMod === "tickets" ? [
          { label: "Events", href: "/admin/events-manage", icon: CalendarDays, badge: null, perm: "events.view" },
          { label: "Registrations", href: "/admin/registrations", icon: UserCheck, badge: bookingsBadge, perm: "registrations.view" },
          { label: "Support Tickets", href: "/admin/support-tickets", icon: LifeBuoy, badge: null, perm: "tickets.view" },
          { label: "Schedules", href: "/admin/schedules", icon: ListTodo, badge: null, perm: "schedules.view" },
        ] : []),
        // CRM-based industries
        ...(industryMod === "crm" ? [
          { label: "Contacts", href: "/admin/contacts", icon: Contact, badge: null, perm: "contacts.view" },
          { label: "Deals", href: "/admin/deals", icon: Handshake, badge: bookingsBadge, perm: "deals.view" },
          { label: "Pipeline", href: "/admin/pipeline", icon: ClipboardList, badge: null, perm: "pipeline.view" },
          { label: "Activities", href: "/admin/activities", icon: Activity, badge: null, perm: "activities.view" },
          { label: "Proposals", href: "/admin/proposals", icon: FileCheck, badge: null, perm: "proposals.view" },
        ] : []),
        { label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare, badge: inquiriesBadge, perm: "inquiries.view" },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Transactions", href: "/admin/transactions", icon: Receipt, badge: null, perm: "transactions.view" },
        { label: "Reports", href: "/admin/reports", icon: BarChart3, badge: null, perm: "reports.view" },
      ],
    },
    {
      label: "Website",
      items: [
        { label: "Content", href: "/admin/content", icon: FileText, badge: null, perm: "content.edit" },
        { label: "Media", href: "/admin/media", icon: ImageIcon, badge: null, perm: "media.upload" },
        { label: "Testimonials", href: "/admin/testimonials", icon: Star, badge: null, perm: "testimonials.edit" },
        { label: "Integrations", href: "/admin/integrations", icon: Plug, badge: null, perm: "integrations.edit" },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Settings", href: "/admin/settings", icon: Settings, badge: null, perm: "settings.edit" },
        { label: "Team", href: "/admin/team", icon: Users, badge: null, perm: "team.manage" },
      ],
    },
  ];

  // Filter sidebar based on permissions — hide sections the user can't access
  const navSections = allNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.perm || has(item.perm)),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Colors
  const bg = dark ? "bg-[#0a0b0f]" : "bg-[#f5f6f8]";
  const sidebarBg = dark ? "bg-[#0f1117]" : "bg-white";
  const sidebarBorder = dark ? "border-white/[0.06]" : "border-gray-200/80";
  const cardBg = dark ? "bg-[#151721]" : "bg-white";
  const textPrimary = dark ? "text-white" : "text-gray-900";
  const textSecondary = dark ? "text-gray-400" : "text-gray-500";
  const textMuted = dark ? "text-gray-500" : "text-gray-400";
  const hoverBg = dark ? "hover:bg-white/[0.04]" : "hover:bg-gray-100/60";
  const activeBg = dark
    ? "bg-white/[0.08] text-white"
    : "text-white";

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {navSections.map((section) => (
        <div key={section.label} className="mb-5">
          <p className={`px-5 text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-gray-600" : "text-gray-400/70"}`}>
            {section.label}
          </p>
          <div className="space-y-0.5 px-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onLinkClick}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? dark ? activeBg : "text-white"
                      : `${dark ? "text-gray-400" : "text-gray-600"} ${hoverBg} ${dark ? "hover:text-gray-200" : "hover:text-gray-800"}`
                  }`}
                  style={active && !dark ? { background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` } : undefined}
                >
                  <Icon className={`w-[17px] h-[17px] flex-shrink-0 ${active ? (dark ? "text-white" : "text-white/90") : dark ? "text-gray-500" : "text-gray-400"}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && !active && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className={`min-h-screen ${bg} flex`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 ${sidebarBg} border-r ${sidebarBorder}`}>
        <div className={`h-[60px] flex items-center gap-3 px-5 border-b ${sidebarBorder}`}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md"
            style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
          >
            {config.businessName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate leading-tight ${textPrimary}`}>{config.businessName}</p>
            <p className={`text-[10px] font-medium ${textMuted}`}>Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <NavContent />
        </nav>

        <div className={`p-3 border-t ${sidebarBorder} space-y-0.5`}>
          <button
            onClick={toggle}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full transition-colors ${dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            {dark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL ?? "/"}
            target="_blank"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <ExternalLink className="w-[17px] h-[17px]" />
            View Live Site
          </a>
          <form action="/admin/login" method="GET">
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                fetch("/api/auth/signout", { method: "POST" }).then(() => {
                  window.location.href = "/admin/login";
                });
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${dark ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06]" : "text-red-400 hover:text-red-600 hover:bg-red-50"}`}
            >
              <LogOut className="w-[17px] h-[17px]" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 h-14 ${dark ? "bg-[#0f1117]/95 border-white/[0.06]" : "bg-white/95 border-gray-200"} backdrop-blur-md border-b flex items-center justify-between px-4`}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
          >
            {config.businessName.charAt(0)}
          </div>
          <span className={`text-sm font-bold ${textPrimary}`}>{config.businessName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className={`p-2 rounded-lg ${hoverBg}`}>
            {dark ? <Sun className="w-4 h-4 text-gray-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
          </button>
          <AdminLiveUpdates />
          <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg ${hoverBg}`}>
            <Menu className={`w-5 h-5 ${textPrimary}`} />
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[240px] ${sidebarBg} shadow-2xl flex flex-col`}
            >
              <div className={`h-14 flex items-center justify-between px-4 border-b ${sidebarBorder}`}>
                <span className={`text-sm font-bold ${textPrimary}`}>Menu</span>
                <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-lg ${hoverBg}`}>
                  <X className={`w-4 h-4 ${textSecondary}`} />
                </button>
              </div>
              <nav className="flex-1 py-4 overflow-y-auto">
                <NavContent onLinkClick={() => setSidebarOpen(false)} />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main
        className="flex-1 lg:ml-[240px] pt-14 lg:pt-0 min-h-screen overflow-x-hidden"
        style={{
          "--color-primary": config.theme.primaryColor,
          "--color-secondary": config.theme.secondaryColor,
          "--color-accent": config.theme.accentColor,
          "--font-heading": config.theme.fontHeading,
        } as React.CSSProperties}
      >
        {children}
      </main>
    </div>
  );
}

export default function AdminShell(props: AdminShellProps) {
  return (
    <AdminThemeProvider>
      <AdminShellInner {...props} />
    </AdminThemeProvider>
  );
}

export type { AdminShellProps };
