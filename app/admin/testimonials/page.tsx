import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { loadSiteConfigFromDB } from "@/lib/load-site-config";
import { getSidebarCounts } from "@/lib/admin-counts";
import TestimonialsView, { type AdminTestimonial } from "./testimonials-view";


export const revalidate = 0;

export default async function TestimonialsPage() {
  const ctx = await getCurrentSite();
  if (!ctx) redirect("/admin/login");

  const supabase = await createClient();
  const [{ data: rows }, config, counts] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA)
      .from("testimonials")
      .select("id, author_name, author_role, author_avatar, body, rating, featured, active, sort_order, created_at")
      .eq(FK_COL, ctx.siteId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    loadSiteConfigFromDB(ctx.site.slug),
    getSidebarCounts(ctx.siteId),
  ]);

  const testimonials: AdminTestimonial[] = (rows ?? []).map((r: any) => ({
    id: r.id as string,
    author_name: r.author_name as string,
    author_role: (r.author_role as string | null) ?? "",
    author_avatar: (r.author_avatar as string | null) ?? "",
    body: r.body as string,
    rating: (r.rating as number | null) ?? 5,
    featured: Boolean(r.featured),
    active: Boolean(r.active),
    sort_order: (r.sort_order as number | null) ?? 0,
    created_at: r.created_at as string,
  }));

  return <TestimonialsView testimonials={testimonials} config={config} counts={counts} />;
}
