import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import type { Inquiry } from "@/lib/admin-types";
import InquiriesView from "./inquiries-view";


export const revalidate = 0;

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  created_at: string;
};

export default async function InquiriesPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const [{ data }, config, counts] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("inquiries")
      .select("id, name, email, phone, message, status, created_at")
      .eq(FK_COL, ctx.siteId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(200),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  const inquiries: Inquiry[] = ((data ?? []) as InquiryRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    message: r.message,
    status: r.status === "archived" ? "read" : r.status,
    createdAt: r.created_at,
  }));

  return <InquiriesView inquiries={inquiries} config={config} counts={counts} />;
}
