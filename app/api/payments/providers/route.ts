import { NextResponse, type NextRequest } from "next/server";
import { loadEnabledProviders, getSiteByRef } from "@/lib/payments/providers";

/**
 * Public endpoint — returns which payment providers are enabled for a site.
 * The booking modal calls this to decide whether to show a payment method picker.
 *
 * GET /api/payments/providers?slug=your-site-slug
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  // Active-site check works in both modes (service client, or the anon
  // get_public_site definer RPC keyless).
  const site = await getSiteByRef(slug);
  if (!site) return NextResponse.json({ ok: false, error: "Site not found." }, { status: 404 });

  const providers = await loadEnabledProviders(site.id);

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
