import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import TransactionsView, { type AdminTransaction } from "./transactions-view";
import { CURRENCY_CODE } from "@/lib/currency";

export const revalidate = 0;

export default async function TransactionsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = createServiceClient();
  const [{ data: rows }, config, counts, { data: bookingRows }] = await Promise.all([
    withSchema(supabase, BOOKING_SCHEMA)
      .from("transactions")
      .select("id, booking_id, booking_ref, provider, provider_ref, amount_cents, fee_cents, net_cents, currency, status, customer_email, customer_name, error_message, paid_at, refunded_at, created_at, raw")
      .eq(FK_COL, ctx.siteId)
      .order("created_at", { ascending: false })
      .limit(500),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
    withSchema(supabase, BOOKING_SCHEMA)
      .from("bookings")
      .select("reference, resource_id")
      .eq(FK_COL, ctx.siteId),
  ]);

  // Map booking reference → resource_id, then resource_id → room name/type
  const bookingResourceMap = new Map<string, string>();
  for (const b of bookingRows ?? []) {
    bookingResourceMap.set(b.reference as string, b.resource_id as string);
  }
  const resourceIds = new Set(bookingResourceMap.values());
  const { data: resourceRows } = resourceIds.size > 0
    ? await withSchema(supabase, BOOKING_SCHEMA).from("resources")
        .select("id, name, type")
        .eq(FK_COL, ctx.siteId)
        .in("id", Array.from(resourceIds))
    : { data: [] };
  const resourceById = new Map<string, any>((resourceRows ?? []).map((r: any) => [r.id as string, r]));

  const transactions: AdminTransaction[] = (rows ?? []).map((r: any) => {
    const ref = (r.booking_ref as string | null) ?? "";
    const resId = bookingResourceMap.get(ref);
    const resource = resId ? resourceById.get(resId) : null;
    return {
    id:             r.id as string,
    bookingId:      (r.booking_id as string | null) ?? null,
    bookingRef:     ref,
    roomNumber:     (resource?.name as string | null) ?? "",
    roomType:       (resource?.type as string | null) ?? "",
    provider:       r.provider as "paystack" | "stripe" | "manual",
    providerRef:    (r.provider_ref as string | null) ?? "",
    amount:         Number(r.amount_cents) / 100,
    fee:            Number(r.fee_cents) / 100,
    net:            Number(r.net_cents) / 100,
    currency:       (r.currency as string) || CURRENCY_CODE,
    status:         r.status as "pending" | "succeeded" | "failed" | "refunded",
    customerEmail:  (r.customer_email as string | null) ?? "",
    customerName:   (r.customer_name as string | null) ?? "",
    errorMessage:   (r.error_message as string | null) ?? "",
    paidAt:         (r.paid_at as string | null) ?? null,
    refundedAt:     (r.refunded_at as string | null) ?? null,
    createdAt:      r.created_at as string,
    raw:            (r.raw as Record<string, unknown> | null) ?? null,
  };
  });

  return <TransactionsView transactions={transactions} config={config} counts={counts} />;
}
