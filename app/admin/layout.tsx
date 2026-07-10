import type { Metadata } from "next";
import { getCurrentSite } from "@/lib/site-scope";
import { ROLE_DEFAULTS, type Role } from "@/lib/audit";
import { AdminRoleProvider } from "./role-context";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin layout — runs on EVERY admin page load.
 * Fetches the user's role + permissions from the DB (not cookies)
 * and provides them to all admin pages via React context.
 *
 * This is the single source of truth for "what can this user see/do."
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentSite();

  // Not logged in — children will handle redirect to /admin/login
  if (!ctx) {
    return <>{children}</>;
  }

  const role = ctx.role as Role;
  const permObj = ctx.permissions ?? {};
  const permissions = Array.isArray((permObj as Record<string, unknown>).permissions)
    ? (permObj as Record<string, unknown>).permissions as string[]
    : (ROLE_DEFAULTS[role] ?? []) as string[];
  const masking = ((permObj as Record<string, unknown>).masking ?? {}) as Record<string, boolean>;

  return (
    <AdminRoleProvider
      role={role}
      permissions={permissions}
      masking={masking}
    >
      {children}
    </AdminRoleProvider>
  );
}
