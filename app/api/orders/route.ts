import { FK_COL, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { fmtMoneyCents } from "@/lib/currency";
import { orderConfirmationEmail, orderNotificationEmail } from "@/lib/email/templates";

type Item = { name: string; price_cents: number; quantity: number; variant?: string };
type Customer = { full_name?: string; email?: string; phone?: string; address?: Record<string, string> | null };

export async function POST(request: NextRequest) {
  let body: { slug?: string; customer?: Customer; items?: Item[]; subtotal_cents?: number; currency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const slug     = String(body.slug ?? "").trim();
  const items    = body.items ?? [];
  const customer = body.customer ?? {};
  const currency = body.currency ?? "EUR";

  if (!slug || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing slug or items." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: site } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("sites")
    .select("id, name, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!site || site.status !== "active") return NextResponse.json({ ok: false, error: "Site not found." }, { status: 404 });

  const siteId  = site.id as string;

  // ── Server-side repricing ──────────────────────────────────────────────
  // NEVER trust client-sent prices: body.items[].price_cents and
  // body.subtotal_cents are attacker-controlled (a customer could order a
  // €500 item for 1 cent). When this site manages its catalog in the DB,
  // every line item is re-priced from public.products and unknown items are
  // rejected. Sites with an empty DB catalog (static, enquiry-style menus
  // with no online payment) fall back to the client price — those orders are
  // records, not charges; the payments initialize route only ever charges
  // DB-verified amounts.
  const clean = (s: unknown) => String(s ?? "").trim().toLowerCase();
  const { data: catalog } = await supabase
    .from("products")
    .select("name, slug, price_cents, in_stock, is_published")
    .eq("site_id", siteId)
    .eq("is_published", true);
  const hasDbCatalog = (catalog ?? []).length > 0;
  const byName = new Map((catalog ?? []).map((p) => [clean(p.name), p]));

  let quantityInvalid = false;
  const pricedItems = items.map((i) => {
    const qty = Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 999 ? i.quantity : NaN;
    if (Number.isNaN(qty)) { quantityInvalid = true; return null; }
    if (!hasDbCatalog) {
      const price = Number.isFinite(i.price_cents) && i.price_cents >= 0 ? Math.round(i.price_cents) : 0;
      return { name: i.name, qty, price, variant: i.variant };
    }
    const product = byName.get(clean(i.name));
    if (!product || product.in_stock === false) return null; // unknown / unavailable item
    return { name: product.name as string, qty, price: product.price_cents as number, variant: i.variant };
  });
  if (quantityInvalid) {
    return NextResponse.json({ ok: false, error: "Invalid quantity." }, { status: 400 });
  }
  if (pricedItems.some((i) => i === null)) {
    return NextResponse.json({ ok: false, error: "One or more items are unavailable — refresh the shop and try again." }, { status: 409 });
  }
  const orderItems = pricedItems as Array<{ name: string; qty: number; price: number; variant?: string }>;
  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      site_id:          siteId,
      guest_email:      customer.email ?? "",
      guest_name:       customer.full_name ?? null,
      guest_phone:      customer.phone ?? null,
      shipping_address: customer.address ?? null,
      items:            orderItems,
      subtotal,
      tax:              0,
      total:            subtotal,
      notes:            currency,
      status:           "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // ── Fire-and-forget email notifications ──────────────────────────────────
  const orderId  = order.id as string;
  const reference = orderId.slice(0, 8).toUpperCase();

  // Load site settings for email/brand info + check payment providers in parallel
  const [{ data: settings }, { data: paymentProviders }] = await Promise.all([
    withSchema(supabase, KODAGEN_SCHEMA).from("site_settings").select("business_name, primary_email").eq(FK_COL, siteId).maybeSingle(),
    supabase.from("integrations_config").select("kind").eq(FK_COL, siteId).eq("enabled", true).in("kind", ["paystack", "stripe"]).limit(1),
  ]);

  const hasPayment = (paymentProviders ?? []).length > 0;

  const siteName   = (settings?.business_name as string) || (site.name as string) || "Store";
  const brandColor = "#a87c44";
  const adminEmail = (settings?.primary_email  as string) || "";

  const addr = customer.address;
  const shippingAddress = addr
    ? [addr.line1, addr.city, addr.postcode, addr.country].filter(Boolean).join(", ")
    : undefined;

  const fmtMoney = (cents: number) => fmtMoneyCents(cents, currency);

  const emailItems = orderItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, variant: i.variant }));
  const totalFormatted = fmtMoney(subtotal);

  // 1. Confirmation email to customer
  if (customer.email) {
    const tmpl = orderConfirmationEmail({
      siteName,
      brandColor,
      customerName: customer.full_name || customer.email.split("@")[0],
      reference,
      items: emailItems,
      totalFormatted,
      shippingAddress,
      awaitingPayment: hasPayment,
    });
    sendEmail(siteId, { to: customer.email, ...tmpl, tags: [{ name: "type", value: "order-confirmation" }] })
      .catch((e) => console.error("[email] order confirmation:", e));
  }

  // 2. Notification email to admin
  if (adminEmail) {
    const tmpl = orderNotificationEmail({
      siteName,
      brandColor,
      customerName:  customer.full_name || "Guest",
      customerEmail: customer.email  || "",
      customerPhone: customer.phone  || "",
      reference,
      items: emailItems,
      totalFormatted,
      shippingAddress,
    });
    sendEmail(siteId, { to: adminEmail, ...tmpl, tags: [{ name: "type", value: "order-notification" }] })
      .catch((e) => console.error("[email] order notification:", e));
  }

  return NextResponse.json({ ok: true, orderId });
}
