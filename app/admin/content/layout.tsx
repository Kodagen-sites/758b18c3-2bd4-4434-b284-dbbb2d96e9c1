import { redirect } from "next/navigation";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import AdminShell from "@/components/admin/admin-shell";

/**
 * Every /admin/content/* page renders inside the admin shell (sidebar +
 * header + theme) — the content section must look like the rest of the
 * admin, not a bare standalone page.
 */
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentSite();
  if (!ctx?.site) redirect("/admin/login");

  const [config, counts] = await Promise.all([
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);
  if (!config) redirect("/admin/login");

  return (
    <AdminShell config={config} counts={counts}>
      {children}
    </AdminShell>
  );
}
