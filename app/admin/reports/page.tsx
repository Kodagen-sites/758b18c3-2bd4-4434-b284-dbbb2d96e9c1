import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import ReportsView, { type ReportTransaction } from "./reports-view";
import { CURRENCY_CODE } from "@/lib/currency";

export const revalidate = 0;

export default async function ReportsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = createServiceClient();
  // Pull last 365 days — the client-side date filter slices it further.
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const [{ data: rows }, config, counts] = await Promise.all([
    withSchema(supabase, BOOKING_SCHEMA)
      .from("transactions")
      .select("provider, amount_cents, fee_cents, net_cents, currency, status, paid_at, created_at")
      .eq(FK_COL, ctx.siteId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  const transactions: ReportTransaction[] = (rows ?? []).map((r: any) => ({
    provider: r.provider as "paystack" | "stripe" | "manual",
    amount:   Number(r.amount_cents) / 100,
    fee:      Number(r.fee_cents) / 100,
    net:      Number(r.net_cents) / 100,
    currency: (r.currency as string) || CURRENCY_CODE,
    status:   r.status as "pending" | "succeeded" | "failed" | "refunded",
    at:       (r.paid_at as string | null) ?? (r.created_at as string),
  }));

  return <ReportsView transactions={transactions} config={config} counts={counts} />;
}
