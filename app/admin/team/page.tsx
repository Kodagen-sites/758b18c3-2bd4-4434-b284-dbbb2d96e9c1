import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import TeamView, { type TeamMember } from "./team-view";

export const revalidate = 0;

export default async function TeamPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  // Authenticated cookie client — kodagen.user_sites carries a "members list
  // site members" policy and audit_log an owner-read policy (migration 010), so
  // this reads the team without a service key.
  const supabase = await createClient();
  const [{ data: mappings }, config, counts, { data: auditRows }] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA).from("user_sites")
      .select("user_id, role, display_name, active, permissions, created_at")
      .eq(FK_COL, ctx.siteId)
      .order("created_at"),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    withSchema(supabase, KODAGEN_SCHEMA).from("audit_log")
      .select("user_email, user_name, action, entity_type, entity_id, details, created_at")
      .eq(FK_COL, ctx.siteId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Resolve auth emails via the site-scoped get_users_emails SECURITY DEFINER
  // RPC (008) instead of the service-key-only auth.admin.listUsers.
  const memberIds = (mappings ?? []).map((m: any) => m.user_id as string);
  const { data: emailRows } = memberIds.length > 0
    ? await withSchema(supabase, KODAGEN_SCHEMA).rpc("get_users_emails", { p_site_id: ctx.siteId, user_ids: memberIds })
    : { data: [] as Array<{ id: string; email: string }> };
  const emailById = new Map(((emailRows ?? []) as Array<{ id: string; email: string }>).map((u) => [u.id, u.email]));

  const members: TeamMember[] = (mappings ?? []).map((m: any) => {
    const email = emailById.get(m.user_id as string);
    return {
      userId: m.user_id as string,
      email: email ?? "unknown",
      name: (m.display_name as string) || email?.split("@")[0] || "Unknown",
      role: (m.role as string) || "viewer",
      active: Boolean(m.active ?? true),
      isCurrentUser: m.user_id === ctx.user.id,
      createdAt: m.created_at as string,
    };
  });

  const audit = (auditRows ?? []).map((a: any) => ({
    userEmail: (a.user_email as string) ?? "",
    userName: (a.user_name as string) ?? "",
    action: a.action as string,
    entityType: (a.entity_type as string) ?? "",
    entityId: (a.entity_id as string) ?? "",
    details: (a.details as Record<string, unknown>) ?? {},
    createdAt: a.created_at as string,
  }));

  return <TeamView members={members} audit={audit} currentRole={ctx.role} config={config} counts={counts} />;
}
