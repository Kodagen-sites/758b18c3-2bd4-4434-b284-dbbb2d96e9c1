// ─── Role & Permission system (client-safe — no server imports) ──────

import { CURRENCY_SYMBOL } from "@/lib/currency";

export type Role =
  // Shared
  | "owner" | "admin" | "viewer"
  // Hotel roles
  | "general_manager" | "front_office_manager" | "supervisor" | "receptionist"
  | "night_auditor" | "concierge" | "housekeeping" | "accountant"
  // Catalog/store roles
  | "store_manager" | "sales_associate" | "inventory_clerk" | "content_editor"
  // CRM roles
  | "sales_manager" | "sales_rep" | "support_agent"
  // Tickets roles
  | "event_manager" | "event_coordinator" | "support_lead" | "support_rep";

export type Permission =
  | "dashboard.view"
  | "bookings.view" | "bookings.create" | "bookings.checkin" | "bookings.modify" | "bookings.cancel"
  | "rooms.view" | "rooms.edit"
  | "events.view" | "events.edit"
  | "transactions.view"
  | "reports.view" | "reports.export"
  | "content.edit"
  | "media.upload" | "media.delete"
  | "settings.edit"
  | "integrations.edit"
  | "security.view"
  | "team.manage"
  | "inquiries.view" | "inquiries.reply"
  | "testimonials.edit"
  | "data.unmask"      // see full emails/phones (vs masked)
  // Catalog permissions
  | "products.view" | "products.edit"
  | "categories.view" | "categories.edit"
  | "orders.view" | "orders.create" | "orders.modify" | "orders.cancel"
  | "inventory.view" | "inventory.adjust"
  // CRM permissions
  | "contacts.view" | "contacts.edit"
  | "deals.view" | "deals.edit" | "deals.close"
  | "pipeline.view" | "pipeline.edit"
  | "activities.view" | "activities.edit"
  | "proposals.view" | "proposals.edit" | "proposals.send"
  // Tickets permissions
  | "events.manage" | "registrations.view" | "registrations.manage"
  | "tickets.view" | "tickets.manage" | "tickets.assign"
  | "schedules.view" | "schedules.edit"
  // Customer-management permissions (auth_strategy != "none" only)
  | "customers.view"            // see customer list
  | "customers.manage"          // edit profiles, send password resets, force logout
  | "customers.suspend"         // suspend/unsuspend
  | "customers.ban"             // ban/unban/block (stronger than suspend)
  | "customers.delete_soft"     // soft delete (recoverable)
  | "customers.delete_hard"     // hard delete / GDPR erasure (owner-only by convention)
  | "customers.export"          // GDPR Subject Access Request — export all data
  | "subscribers.view" | "subscribers.manage";

/** Hotel-specific roles with proper permission sets */
export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  // ─── Super admin roles (can create & manage everyone) ───
  owner: [
    "dashboard.view", "bookings.view", "bookings.create", "bookings.checkin", "bookings.modify", "bookings.cancel",
    "rooms.view", "rooms.edit", "events.view", "events.edit",
    "transactions.view", "reports.view", "reports.export",
    "content.edit", "media.upload", "media.delete",
    "settings.edit", "integrations.edit", "security.view",
    "team.manage", "inquiries.view", "inquiries.reply",
    "testimonials.edit", "data.unmask",
    "customers.view", "customers.manage", "customers.suspend", "customers.ban",
    "customers.delete_soft", "customers.delete_hard", "customers.export",
    "subscribers.view", "subscribers.manage",
  ],
  admin: [
    "dashboard.view", "bookings.view", "bookings.create", "bookings.checkin", "bookings.modify", "bookings.cancel",
    "rooms.view", "rooms.edit", "events.view", "events.edit",
    "transactions.view", "reports.view", "reports.export",
    "content.edit", "media.upload", "media.delete",
    "settings.edit", "integrations.edit", "security.view",
    "team.manage", "inquiries.view", "inquiries.reply",
    "testimonials.edit", "data.unmask",
    // Admins get everything except hard delete (owner-only by convention)
    "customers.view", "customers.manage", "customers.suspend", "customers.ban",
    "customers.delete_soft", "customers.export",
    "subscribers.view", "subscribers.manage",
  ],

  // ─── Management roles ───
  general_manager: [
    "dashboard.view", "bookings.view", "bookings.create", "bookings.checkin", "bookings.modify", "bookings.cancel",
    "rooms.view", "rooms.edit", "events.view", "events.edit",
    "transactions.view", "reports.view", "reports.export",
    "content.edit", "media.upload",
    "security.view", "inquiries.view", "inquiries.reply",
    "testimonials.edit", "data.unmask",
  ],
  front_office_manager: [
    "dashboard.view", "bookings.view", "bookings.create", "bookings.checkin", "bookings.modify", "bookings.cancel",
    "rooms.view", "rooms.edit", "events.view",
    "transactions.view", "reports.view",
    "security.view", "inquiries.view", "inquiries.reply",
    "data.unmask",
  ],

  // ─── Operations roles ───
  supervisor: [
    "dashboard.view", "bookings.view", "bookings.create", "bookings.checkin", "bookings.modify",
    "rooms.view", "events.view",
    "transactions.view",
    "security.view", "inquiries.view", "inquiries.reply",
    "data.unmask",
  ],
  receptionist: [
    "dashboard.view", "bookings.view", "bookings.create", "bookings.checkin",
    "rooms.view", "events.view",
    "inquiries.view",
  ],
  night_auditor: [
    "dashboard.view", "bookings.view", "bookings.checkin",
    "rooms.view",
    "transactions.view", "reports.view",
    "security.view",
  ],
  concierge: [
    "dashboard.view", "bookings.view",
    "rooms.view", "events.view",
    "inquiries.view", "inquiries.reply",
  ],

  // ─── Support roles ───
  housekeeping: [
    "dashboard.view",
    "rooms.view",
  ],
  accountant: [
    "dashboard.view",
    "transactions.view", "reports.view", "reports.export",
    "data.unmask",
  ],

  // ─── Catalog/Store roles ───
  store_manager: [
    "dashboard.view",
    "products.view", "products.edit", "categories.view", "categories.edit",
    "orders.view", "orders.create", "orders.modify", "orders.cancel",
    "inventory.view", "inventory.adjust",
    "transactions.view", "reports.view", "reports.export",
    "content.edit", "media.upload",
    "inquiries.view", "inquiries.reply",
    "testimonials.edit", "data.unmask",
  ],
  sales_associate: [
    "dashboard.view",
    "products.view", "categories.view",
    "orders.view", "orders.create",
    "inquiries.view",
  ],
  inventory_clerk: [
    "dashboard.view",
    "products.view", "categories.view",
    "inventory.view", "inventory.adjust",
  ],
  content_editor: [
    "dashboard.view",
    "content.edit", "media.upload",
    "testimonials.edit",
    "products.view",
  ],

  // ─── CRM roles ───
  sales_manager: [
    "dashboard.view",
    "contacts.view", "contacts.edit",
    "deals.view", "deals.edit", "deals.close",
    "pipeline.view", "pipeline.edit",
    "activities.view", "activities.edit",
    "proposals.view", "proposals.edit", "proposals.send",
    "transactions.view", "reports.view", "reports.export",
    "content.edit", "media.upload",
    "inquiries.view", "inquiries.reply",
    "data.unmask",
  ],
  sales_rep: [
    "dashboard.view",
    "contacts.view", "contacts.edit",
    "deals.view", "deals.edit",
    "activities.view", "activities.edit",
    "proposals.view", "proposals.edit",
    "inquiries.view",
  ],
  support_agent: [
    "dashboard.view",
    "contacts.view",
    "activities.view", "activities.edit",
    "inquiries.view", "inquiries.reply",
  ],

  // ─── Tickets/Events roles ───
  event_manager: [
    "dashboard.view",
    "events.view", "events.edit", "events.manage",
    "registrations.view", "registrations.manage",
    "tickets.view", "tickets.manage", "tickets.assign",
    "schedules.view", "schedules.edit",
    "transactions.view", "reports.view", "reports.export",
    "content.edit", "media.upload",
    "inquiries.view", "inquiries.reply",
    "data.unmask",
  ],
  event_coordinator: [
    "dashboard.view",
    "events.view", "events.edit",
    "registrations.view", "registrations.manage",
    "schedules.view", "schedules.edit",
    "inquiries.view",
  ],
  support_lead: [
    "dashboard.view",
    "tickets.view", "tickets.manage", "tickets.assign",
    "inquiries.view", "inquiries.reply",
    "reports.view",
    "data.unmask",
  ],
  support_rep: [
    "dashboard.view",
    "tickets.view", "tickets.manage",
    "inquiries.view",
  ],

  // ─── Read-only ───
  viewer: [
    "dashboard.view", "bookings.view", "rooms.view", "events.view",
    "products.view", "categories.view", "orders.view",
    "contacts.view", "deals.view", "pipeline.view", "activities.view", "proposals.view",
  ],
};

/** Check if a role has a specific permission */
export function hasPermission(role: string, permission: Permission, customPerms?: Record<string, unknown>): boolean {
  // Custom permissions override defaults (if the owner configured them)
  if (customPerms && Array.isArray(customPerms.permissions)) {
    return (customPerms.permissions as string[]).includes(permission);
  }
  const defaults = ROLE_DEFAULTS[role as Role];
  if (!defaults) return false;
  return defaults.includes(permission);
}

/** Mask an email for display: j****@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  return `${local[0]}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

/** Mask a phone for display: +234 *** *** 5678 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return "****";
  return phone.slice(0, 4) + " *** *** " + phone.slice(-4);
}

/** Mask a name for display: J**** I**** */
export function maskName(name: string): string {
  return name.split(" ").map((w) => w[0] + "*".repeat(Math.max(w.length - 1, 3))).join(" ");
}

/** Mask a currency amount using the site's currency symbol: $*** */
export function maskAmount(): string {
  return `${CURRENCY_SYMBOL}***`;
}

export type MaskingConfig = {
  unmaskEmail: boolean;
  unmaskPhone: boolean;
  unmaskName: boolean;
  seeRevenue: boolean;
};

/** Get masking config from user permissions, with defaults based on role */
export function getMaskingConfig(role: string, permissions?: Record<string, unknown>): MaskingConfig {
  const masking = (permissions?.masking ?? {}) as Partial<MaskingConfig>;

  // Owner and admin always see everything
  if (role === "owner" || role === "admin") {
    return { unmaskEmail: true, unmaskPhone: true, unmaskName: true, seeRevenue: true };
  }

  return {
    unmaskEmail: masking.unmaskEmail ?? false,
    unmaskPhone: masking.unmaskPhone ?? false,
    unmaskName: masking.unmaskName ?? true,   // names visible by default
    seeRevenue: masking.seeRevenue ?? false,
  };
}
