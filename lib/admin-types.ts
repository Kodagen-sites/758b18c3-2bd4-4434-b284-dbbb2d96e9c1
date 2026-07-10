export interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomType: string;
  /** UUID of the assigned resource (room) — used for the floor-plan picker / reassignment */
  resourceId: string;
  /** Human-readable room number (e.g. "101", "Penthouse") — what guests / staff actually say out loud */
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  /** Payment status from the transactions table */
  paymentStatus: "paid" | "unpaid" | "pending_payment";
  /** Which provider handled the payment */
  paymentProvider?: string;
  /** "room" or "event" — determines which admin section it belongs to */
  bookingType: "room" | "event";
  specialRequests?: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: string;
}

export interface MediaItem {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  section: "gallery" | "rooms" | "hero" | "about";
  createdAt: string;
}

export interface AdminStats {
  totalBookings: number;
  pendingBookings: number;
  checkedInGuests: number;
  totalRevenue: number;
  newInquiries: number;
  pageViews: number;
  conversionRate: number;
}

export type IndustryModule = "bookings" | "rentals" | "appointments" | "catalog" | "crm" | "tickets";

const INDUSTRY_MODULES: readonly IndustryModule[] = ["bookings", "rentals", "appointments", "catalog", "crm", "tickets"];

/** What the sidebar/nav should call the operations module and which sub-pages
 *  it gets. Resolution order:
 *    1. `config.adminModule` — explicit override the build agent can set in
 *       site-config.ts when the heuristics below would guess wrong.
 *    2. `config.engine` — the engine actually shipped (catalog/crm/tickets are
 *       unambiguous; "booking" is refined by templateId into hotel bookings,
 *       rentals, or appointments).
 *    3. templateId table — covers every known template; unknown templates get
 *       "appointments" (generic service business), NOT hotel bookings.
 */
export function getIndustryModule(
  input: string | { templateId?: string; engine?: string; adminModule?: string } | null | undefined,
): IndustryModule {
  const cfg = typeof input === "string" ? { templateId: input } : (input ?? {});
  const override = (cfg as { adminModule?: string }).adminModule;
  if (override && (INDUSTRY_MODULES as readonly string[]).includes(override)) {
    return override as IndustryModule;
  }
  const engine = String((cfg as { engine?: string }).engine ?? "").toLowerCase();
  if (engine.includes("catalog")) return "catalog";
  if (engine.includes("crm")) return "crm";
  if (engine.includes("ticket")) return "tickets";
  return moduleFromTemplateId(cfg.templateId ?? "");
}

function moduleFromTemplateId(templateId: string): IndustryModule {
  switch (templateId) {
    // Hotel / venue / reservation businesses — rooms, occupancy, events, security
    case "hospitality-v1":
    case "universal-editorial-hotel-v1":
    case "travel-v1":
    case "travel-v2":
    case "restaurant-v1":
    case "restaurant-v2":
    case "aviation-v1":
      return "bookings";
    // Vehicle / equipment rental
    case "auto-v1":
    case "auto-v2":
      return "rentals";
    // Product storefronts
    case "fashion-v1":
    case "fashion-v2":
    case "pharmacy-v1":
    case "agriculture-v1":
    case "interior-v1":
    case "logistics-v1":
      return "catalog";
    // B2B pipeline businesses — deals, proposals, contacts
    case "insurance-v1":
    case "realestate-v1":
    case "realestate-v2":
    case "construction-v1":
    case "construction-v2":
    case "security-v1":
    case "security-v2":
    case "security-v3":
    case "security-v4":
    case "universal-security-premium-v1":
    case "oilgas-v1":
    case "oilgas-v2":
      return "crm";
    // Event / registration businesses
    case "tech-v1":
    case "tech-v2":
    case "events-v1":
    case "church-v1":
      return "tickets";
    // Service businesses that book appointments (salon, clinic, gym, firm…)
    case "professional-v1":
    case "fitness-v1":
    case "fitness-v2":
    case "beauty-v1":
    case "beauty-v2":
    case "law-v1":
    case "law-v2":
    case "education-v1":
    case "education-v2":
    case "medical-v1":
    case "medical-v2":
    case "cleaning-v1":
    case "cleaning-v2":
    case "consulting-v1":
    case "consulting-v2":
    case "universal-editorial-v1":
    case "universal-editorial-consultancy-v1":
      return "appointments";
    // Unknown template: a generic service business gets Appointments +
    // Services + Inquiries — never a hotel admin with Rooms/Security.
    default:
      return "appointments";
  }
}

export function getIndustryLabel(mod: IndustryModule): string {
  switch (mod) {
    case "bookings": return "Bookings";
    case "rentals": return "Rentals";
    case "appointments": return "Appointments";
    case "catalog": return "Orders";
    case "crm": return "Deals";
    case "tickets": return "Tickets";
  }
}

// ─── Team & Auth ───────────────────────────────────────

export type TeamRole = "owner" | "admin" | "manager" | "staff";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar?: string;
  status: "active" | "invited" | "deactivated";
  permissions: ModulePermission[];
  lastActive?: string;
  createdAt: string;
}

export type ModulePermission =
  | "dashboard"
  | "bookings"
  | "rentals"
  | "appointments"
  | "inquiries"
  | "content"
  | "media"
  | "settings"
  | "team";

export const roleConfig: Record<TeamRole, { label: string; color: string; bg: string; description: string }> = {
  owner: { label: "Owner", color: "text-purple-700", bg: "bg-purple-100", description: "Full access to everything. Cannot be removed." },
  admin: { label: "Admin", color: "text-blue-700", bg: "bg-blue-100", description: "Full access except team ownership transfer." },
  manager: { label: "Manager", color: "text-green-700", bg: "bg-green-100", description: "Can manage bookings, content, and inquiries." },
  staff: { label: "Staff", color: "text-gray-600", bg: "bg-gray-100", description: "View-only access to bookings and inquiries." },
};

export const defaultPermissions: Record<TeamRole, ModulePermission[]> = {
  owner: ["dashboard", "bookings", "rentals", "appointments", "inquiries", "content", "media", "settings", "team"],
  admin: ["dashboard", "bookings", "rentals", "appointments", "inquiries", "content", "media", "settings", "team"],
  manager: ["dashboard", "bookings", "rentals", "appointments", "inquiries", "content", "media"],
  staff: ["dashboard", "bookings", "rentals", "appointments", "inquiries"],
};

export const allModules: { id: ModulePermission; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bookings", label: "Bookings / Rentals / Appointments" },
  { id: "inquiries", label: "Inquiries & Messages" },
  { id: "content", label: "Content Management" },
  { id: "media", label: "Media Library" },
  { id: "settings", label: "Settings" },
  { id: "team", label: "Team Management" },
];
