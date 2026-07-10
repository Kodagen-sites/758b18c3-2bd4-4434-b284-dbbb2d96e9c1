import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { loadEnabledProviders } from "@/lib/payments/providers";

/**
 * Public endpoint — returns which payment providers are enabled for a site.
 * The booking modal calls this to decide whether to show a payment method picker.
 *
 * GET /api/payments/providers?slug=your-site-slug
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: site } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("sites")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!site || site.status !== "active") return NextResponse.json({ ok: false, error: "Site not found." }, { status: 404 });

  const providers = await loadEnabledProviders(site.id as string);

  return NextResponse.json({
    ok: true,
    providers: providers.map((p) => ({
      kind: p.kind,
      label: p.kind === "paystack" ? "Pay with Paystack" : "Pay with Stripe",
      description: p.kind === "paystack"
        ? "Cards, bank transfer, USSD (Nigeria)"
        : "Cards, Apple Pay, Google Pay (International)",
    })),
  });
}
