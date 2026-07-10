/**
 * Inline-styled HTML email templates. We keep these as plain functions
 * returning HTML strings rather than React Email components — avoids an
 * extra compile step and works in all environments.
 *
 * All styles are inline (email clients strip <style> blocks).
 */

const base = (body: string, brandColor = "#1a365d") => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <tr>
      <td style="background:${brandColor};padding:28px 32px 24px">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;font-family:Georgia,serif">__SITE_NAME__</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px 32px">${body}</td>
    </tr>
    <tr>
      <td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="margin:0;font-size:11px;color:#9ca3af">&copy; ${new Date().getFullYear()} __SITE_NAME__. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

function wrap(html: string, siteName: string, brandColor?: string) {
  return base(html, brandColor).replace(/__SITE_NAME__/g, siteName);
}

// ─── Booking confirmation (sent to guest after payment or manual confirm) ─

export function bookingConfirmationEmail(data: {
  siteName: string;
  brandColor?: string;
  guestName: string;
  reference: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;    // ISO
  checkOut: string;
  nights: number;
  guests: number;
  totalFormatted: string;
  paymentStatus: "paid" | "pending" | "none";
  hotelAddress: string;
  hotelPhone: string;
  /** If true, uses event language instead of room/hotel language */
  isEvent?: boolean;
  /** Event-specific: duration string like "4-5 hours" */
  eventDuration?: string;
}) {
  const ci = new Date(data.checkIn);
  const co = new Date(data.checkOut);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const isEvent = data.isEvent ?? false;
  const sameDay = ci.toDateString() === co.toDateString();

  const paymentBadge = data.paymentStatus === "paid"
    ? `<span style="display:inline-block;padding:2px 10px;border-radius:100px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700">✓ Paid</span>`
    : data.paymentStatus === "pending"
      ? `<span style="display:inline-block;padding:2px 10px;border-radius:100px;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700">⏳ Pending payment</span>`
      : "";

  const title = isEvent ? "Your event is confirmed!" : "Your booking is confirmed!";
  const subject = isEvent
    ? `Event confirmed — ${data.roomType} — ${data.reference}`
    : `Booking confirmed — ${data.reference}`;
  const closing = isEvent
    ? "We look forward to hosting your event. Reply to this email if you have any special requirements."
    : "We look forward to welcoming you. Reply to this email if you need anything before your stay.";

  // Build the details rows — different for events vs rooms
  const detailRows = isEvent ? `
    <tr>
      <td width="50%" style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Event</p><p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#111827">${data.roomType}</p></td>
      <td width="50%" style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Guests</p><p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#111827">${data.guests}</p></td>
    </tr>
    <tr>
      <td style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Date</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${fmt(ci)}</p></td>
      <td style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Duration</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${data.eventDuration ?? "Full day"}</p></td>
    </tr>
    <tr>
      <td colspan="2" style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Total</p><p style="margin:2px 0 0;font-size:18px;font-weight:800;color:#111827">${data.totalFormatted}</p></td>
    </tr>
  ` : `
    <tr>
      <td width="50%" style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Room</p><p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#111827">${data.roomNumber} · ${data.roomType}</p></td>
      <td width="50%" style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Guests</p><p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#111827">${data.guests}</p></td>
    </tr>
    <tr>
      <td style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Check-in</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${fmt(ci)}</p></td>
      <td style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Check-out</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${fmt(co)}</p></td>
    </tr>
    <tr>
      <td style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Duration</p><p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${data.nights} night${data.nights === 1 ? "" : "s"}</p></td>
      <td style="padding:4px 0"><p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Total</p><p style="margin:2px 0 0;font-size:18px;font-weight:800;color:#111827">${data.totalFormatted}</p></td>
    </tr>
  `;

  return {
    subject,
    html: wrap(`
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${data.guestName},</p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#111827">${title} ${paymentBadge}</h2>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 20px">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #f3f4f6">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700">Reference</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#111827;font-family:monospace">${data.reference}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280"><strong>Address:</strong> ${data.hotelAddress}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280"><strong>Phone:</strong> ${data.hotelPhone}</p>

      <p style="margin:0;font-size:13px;color:#6b7280">${closing}</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Event booking confirmation (photoshoots, weddings, corporate events, etc.)

export function eventConfirmationEmail(data: {
  siteName: string;
  brandColor?: string;
  guestName: string;
  reference: string;
  eventName: string;
  eventDate: string;       // ISO
  guests: number;
  duration: string;
  totalFormatted: string;
  paymentStatus: "paid" | "pending" | "none";
  venueAddress: string;
  venuePhone: string;
}) {
  const d = new Date(data.eventDate);
  const fmt = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const paymentBadge = data.paymentStatus === "paid"
    ? `<span style="display:inline-block;padding:2px 10px;border-radius:100px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700">✓ Paid</span>`
    : data.paymentStatus === "pending"
      ? `<span style="display:inline-block;padding:2px 10px;border-radius:100px;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700">⏳ Pending payment</span>`
      : "";

  return {
    subject: `Event confirmed — ${data.eventName} — ${data.reference}`,
    html: wrap(`
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${data.guestName},</p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#111827">Your event is confirmed! ${paymentBadge}</h2>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 20px">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #f3f4f6">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700">Reference</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#111827;font-family:monospace">${data.reference}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td colspan="2" style="padding:4px 0">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Event</p>
                  <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#111827">${data.eventName}</p>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:8px 0 4px">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Date</p>
                  <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${fmt}</p>
                </td>
                <td width="50%" style="padding:8px 0 4px">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Duration</p>
                  <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${data.duration || "Full day"}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Guests</p>
                  <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827">${data.guests}</p>
                </td>
                <td style="padding:4px 0">
                  <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px">Total</p>
                  <p style="margin:2px 0 0;font-size:18px;font-weight:800;color:#111827">${data.totalFormatted}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280"><strong>Venue:</strong> ${data.venueAddress}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280"><strong>Phone:</strong> ${data.venuePhone}</p>

      <p style="margin:0;font-size:13px;color:#6b7280">We look forward to hosting your event. Our team will reach out to discuss any specific arrangements. Reply to this email if you have questions.</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Order confirmation (catalog / shop orders) ───────────────────────────────

export function orderConfirmationEmail(data: {
  siteName: string;
  brandColor?: string;
  customerName: string;
  reference: string;
  items: Array<{ name: string; qty: number; price: number; variant?: string }>;
  totalFormatted: string;
  shippingAddress?: string;
  /** true = going to a payment gateway, false = order accepted directly */
  awaitingPayment: boolean;
}) {
  const itemRows = data.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
        <p style="margin:0;font-size:14px;color:#111827;font-weight:600">${i.name}${i.variant ? ` <span style="font-weight:400;color:#6b7280">· ${i.variant}</span>` : ""}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#9ca3af">Qty ${i.qty}</p>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap">
        <span style="font-size:14px;color:#111827;font-weight:600">${data.totalFormatted.replace(/[\d.,]+/, (n) => String(((i.price * i.qty) / 100).toFixed(2)))}</span>
      </td>
    </tr>
  `).join("");

  const badge = data.awaitingPayment
    ? `<span style="display:inline-block;padding:2px 10px;border-radius:100px;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700">⏳ Awaiting payment</span>`
    : `<span style="display:inline-block;padding:2px 10px;border-radius:100px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700">✓ Order received</span>`;

  const paymentNote = data.awaitingPayment
    ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280">You'll be redirected to complete your payment. Your order is reserved in the meantime.</p>`
    : `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280">We've received your order and will be in touch to confirm dispatch. Reply to this email with any questions.</p>`;

  return {
    subject: `Order received — ${data.reference} — ${data.siteName}`,
    html: wrap(`
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${data.customerName || "there"},</p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#111827">Thanks for your order! ${badge}</h2>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 20px">
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #f3f4f6">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700">Order reference</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#111827;font-family:monospace">${data.reference}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
              <tr>
                <td><p style="margin:0;font-size:13px;font-weight:700;color:#111827">Total</p></td>
                <td style="text-align:right"><p style="margin:0;font-size:16px;font-weight:800;color:#111827">${data.totalFormatted}</p></td>
              </tr>
            </table>
          </td>
        </tr>
        ${data.shippingAddress ? `
        <tr>
          <td style="padding:12px 20px;border-top:1px solid #f3f4f6">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700">Shipping to</p>
            <p style="margin:4px 0 0;font-size:13px;color:#374151">${data.shippingAddress}</p>
          </td>
        </tr>` : ""}
      </table>

      ${paymentNote}
    `, data.siteName, data.brandColor),
  };
}

// ─── Order notification (sent to admin when a new order comes in) ─────────────

export function orderNotificationEmail(data: {
  siteName: string;
  brandColor?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  reference: string;
  items: Array<{ name: string; qty: number; price: number; variant?: string }>;
  totalFormatted: string;
  shippingAddress?: string;
}) {
  const itemList = data.items.map(i =>
    `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`
  ).join("<br>");

  return {
    subject: `New order — ${data.reference} — ${data.customerName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">New order on your store</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 16px">
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Reference</strong><br>
          <span style="font-size:15px;font-weight:800;font-family:monospace;color:#111827">${data.reference}</span>
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Customer</strong><br>
          <span style="font-size:14px;font-weight:600;color:#111827">${data.customerName}</span>
          ${data.customerEmail ? `&nbsp;·&nbsp;<a href="mailto:${data.customerEmail}" style="color:#2563eb;font-size:14px">${data.customerEmail}</a>` : ""}
          ${data.customerPhone ? `&nbsp;·&nbsp;<span style="font-size:14px;color:#374151">${data.customerPhone}</span>` : ""}
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Items</strong><br>
          <p style="margin:4px 0 0;font-size:14px;line-height:1.7;color:#374151">${itemList}</p>
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Total</strong><br>
          <span style="font-size:18px;font-weight:800;color:#111827">${data.totalFormatted}</span>
        </td></tr>
        ${data.shippingAddress ? `<tr><td style="padding:12px 20px">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Ship to</strong><br>
          <span style="font-size:14px;color:#374151">${data.shippingAddress}</span>
        </td></tr>` : ""}
      </table>
      <p style="margin:0;font-size:13px;color:#6b7280">Log in to your admin panel to process this order.</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Payment confirmed (sent to customer after successful payment) ────────────

export function orderPaymentConfirmedEmail(data: {
  siteName: string;
  brandColor?: string;
  customerName: string;
  reference: string;
  totalFormatted: string;
  items: Array<{ name: string; qty: number; price: number; variant?: string }>;
}) {
  const itemRows = data.items.map(i => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">
        ${i.name}${i.variant ? ` <span style="color:#9ca3af">· ${i.variant}</span>` : ""} ×${i.qty}
      </td>
    </tr>
  `).join("");

  return {
    subject: `Payment confirmed — ${data.reference} — ${data.siteName}`,
    html: wrap(`
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${data.customerName || "there"},</p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#111827">
        Your payment is confirmed
        <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:100px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700">✓ Paid</span>
      </h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151">
        We've received your payment and your order is now being prepared for dispatch.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 20px">
        <tr><td style="padding:14px 20px;border-bottom:1px solid #f3f4f6">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700">Order reference</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#111827;font-family:monospace">${data.reference}</p>
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
        </td></tr>
        <tr><td style="padding:12px 20px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><p style="margin:0;font-size:13px;font-weight:700;color:#111827">Total paid</p></td>
              <td style="text-align:right"><p style="margin:0;font-size:16px;font-weight:800;color:#111827">${data.totalFormatted}</p></td>
            </tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280">
        We'll send you an update when your order ships. Reply to this email with any questions.
      </p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Payment failed (sent to customer when payment is declined) ───────────────

export function orderPaymentFailedEmail(data: {
  siteName: string;
  brandColor?: string;
  customerName: string;
  reference: string;
  totalFormatted: string;
  reason?: string;
}) {
  return {
    subject: `Payment failed — ${data.reference} — ${data.siteName}`,
    html: wrap(`
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${data.customerName || "there"},</p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#111827">
        Your payment was not successful
        <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:100px;background:#fee2e2;color:#dc2626;font-size:12px;font-weight:700">✗ Failed</span>
      </h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151">
        Unfortunately your payment for order <strong>${data.reference}</strong> (${data.totalFormatted}) could not be processed.
        ${data.reason ? `<br><br>Reason: <em>${data.reason}</em>` : ""}
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151">
        Your items are still reserved. Please try again or contact us and we'll help you complete your order.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280">
        If you believe this is an error, please reply to this email.
      </p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Payment failed admin alert ────────────────────────────────────────────────

export function orderPaymentFailedAdminEmail(data: {
  siteName: string;
  brandColor?: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  totalFormatted: string;
  provider: string;
  reason?: string;
}) {
  return {
    subject: `Payment failed — ${data.reference} — ${data.customerName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">Payment failed on your store</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 16px">
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Reference</strong><br>
          <span style="font-size:15px;font-weight:800;font-family:monospace;color:#111827">${data.reference}</span>
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Customer</strong><br>
          <span style="font-size:14px;font-weight:600;color:#111827">${data.customerName}</span>
          ${data.customerEmail ? `&nbsp;·&nbsp;<a href="mailto:${data.customerEmail}" style="color:#2563eb;font-size:14px">${data.customerEmail}</a>` : ""}
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Amount</strong><br>
          <span style="font-size:16px;font-weight:800;color:#dc2626">${data.totalFormatted}</span>
        </td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Provider</strong><br>
          <span style="font-size:14px;color:#374151">${data.provider}</span>
        </td></tr>
        ${data.reason ? `<tr><td style="padding:12px 20px">
          <strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Failure reason</strong><br>
          <span style="font-size:14px;color:#dc2626">${data.reason}</span>
        </td></tr>` : ""}
      </table>
      <p style="margin:0;font-size:13px;color:#6b7280">The customer has been notified. You may want to follow up directly.</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Inquiry notification (sent to admin when a visitor submits the contact form)

export function inquiryNotificationEmail(data: {
  siteName: string;
  brandColor?: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  message: string;
}) {
  return {
    subject: `New inquiry from ${data.visitorName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">New message from your website</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #f3f4f6;margin:0 0 16px">
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6"><strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">From</strong><br><span style="font-size:14px;font-weight:700;color:#111827">${data.visitorName}</span></td></tr>
        <tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6"><strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Email</strong><br><a href="mailto:${data.visitorEmail}" style="font-size:14px;color:#2563eb">${data.visitorEmail}</a></td></tr>
        ${data.visitorPhone ? `<tr><td style="padding:12px 20px;border-bottom:1px solid #f3f4f6"><strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Phone</strong><br><span style="font-size:14px;color:#111827">${data.visitorPhone}</span></td></tr>` : ""}
        <tr><td style="padding:12px 20px"><strong style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1px">Message</strong><br><p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap">${data.message}</p></td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#6b7280">Reply directly to this email to respond to the visitor, or open your admin panel to manage the inquiry.</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Auto-reply to visitor after inquiry

export function inquiryAutoReplyEmail(data: {
  siteName: string;
  brandColor?: string;
  visitorName: string;
}) {
  return {
    subject: `We received your message — ${data.siteName}`,
    html: wrap(`
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Hi ${data.visitorName},</p>
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">Thank you for reaching out!</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">We've received your message and our team will get back to you within 24 hours.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#374151">If your matter is urgent, feel free to call us directly.</p>
    `, data.siteName, data.brandColor),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOMER AUTH EMAILS
// Ported from working CRM api/lib/mail.js (sendVerificationEmail,
// sendPasswordResetEmail, sendBonusCreditEmail). Adapted to skill's
// brandColor pattern.
// ═══════════════════════════════════════════════════════════════════════

// ─── Email verification (signup OTP) ─────────────────────────────────────
// Translated from working CRM mail.js sendVerificationEmail. Big code box,
// 15-minute expiry message preserved.

export function verificationCodeEmail(data: {
  siteName: string;
  brandColor?: string;
  code: string;             // 6-digit code
  expiresInMinutes?: number;
}) {
  const expiry = data.expiresInMinutes ?? 15;
  return {
    subject: `Verify your email — ${data.siteName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827">Confirm your email address</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">Welcome! Use the code below to verify your email and activate your account.</p>
      <div style="margin:24px 0;padding:24px;background:#f9fafb;border-radius:12px;text-align:center">
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#111827">${data.code}</div>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">This code expires in ${expiry} minutes.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">If you didn't sign up, you can safely ignore this email.</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Password reset code ─────────────────────────────────────────────────
// Translated from working CRM mail.js sendPasswordResetEmail.
// When using Supabase resetPasswordForEmail, Supabase emails its own template.
// Use this only if you're routing email through your own SMTP via the skill's
// email pipeline (Tier 2 owner Resend or Kodagen master fallback).

export function passwordResetCodeEmail(data: {
  siteName: string;
  brandColor?: string;
  code: string;
  expiresInMinutes?: number;
}) {
  const expiry = data.expiresInMinutes ?? 15;
  return {
    subject: `Reset your password — ${data.siteName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827">Reset your password</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">Use the code below to reset your password. If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <div style="margin:24px 0;padding:24px;background:#f9fafb;border-radius:12px;text-align:center">
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#111827">${data.code}</div>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">This code expires in ${expiry} minutes.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">If you didn't request this, your account is still safe.</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Password reset link (Supabase magic link) ───────────────────────────
// Optional — for when admin generates a recovery link via auth.admin.generateLink
// and routes it through this template instead of Supabase's default.

export function passwordResetLinkEmail(data: {
  siteName: string;
  brandColor?: string;
  resetUrl: string;
  expiresInHours?: number;
}) {
  const expiry = data.expiresInHours ?? 1;
  return {
    subject: `Reset your password — ${data.siteName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827">Reset your password</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">Click the button below to set a new password.</p>
      <div style="margin:24px 0;text-align:center">
        <a href="${data.resetUrl}" style="display:inline-block;padding:14px 28px;background:${data.brandColor || "#1a365d"};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Set new password
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">This link expires in ${expiry} hour${expiry === 1 ? "" : "s"}.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">If you didn't request this, you can safely ignore this email.</p>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;word-break:break-all">If the button doesn't work, paste this link into your browser:<br>${data.resetUrl}</p>
    `, data.siteName, data.brandColor),
  };
}

// ─── Suspension / ban notification ───────────────────────────────────────
// Sent to customer when admin suspends or bans their account.

export function accountStatusChangeEmail(data: {
  siteName: string;
  brandColor?: string;
  customerName: string;
  status: "suspended" | "banned" | "reactivated";
  reason?: string;
  contactEmail?: string;
}) {
  const titles = {
    suspended: "Your account has been suspended",
    banned: "Your account has been restricted",
    reactivated: "Your account has been reactivated",
  };
  const bodies = {
    suspended: "Your account access has been temporarily suspended. You will not be able to log in until this is resolved.",
    banned: "Your account access has been permanently revoked.",
    reactivated: "Good news — your account has been reactivated. You can log in normally now.",
  };
  
  return {
    subject: `${titles[data.status]} — ${data.siteName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827">${titles[data.status]}</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151">Hi ${data.customerName},</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">${bodies[data.status]}</p>
      ${data.reason ? `
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border-left:3px solid ${data.brandColor || "#1a365d"};border-radius:4px">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600">REASON</p>
        <p style="margin:0;font-size:14px;color:#111827">${data.reason}</p>
      </div>
      ` : ""}
      ${data.status !== "reactivated" ? `
      <p style="margin:0;font-size:14px;line-height:1.6;color:#374151">If you believe this is an error, please contact ${data.contactEmail ? `<a href="mailto:${data.contactEmail}" style="color:${data.brandColor || "#1a365d"};text-decoration:underline">${data.contactEmail}</a>` : "us"}.</p>
      ` : ""}
    `, data.siteName, data.brandColor),
  };
}

// ─── Welcome email (post-verification) ───────────────────────────────────

export function customerWelcomeEmail(data: {
  siteName: string;
  brandColor?: string;
  customerName: string;
  loginUrl?: string;
}) {
  return {
    subject: `Welcome to ${data.siteName}`,
    html: wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827">Welcome${data.customerName ? `, ${data.customerName}` : ""}!</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">Your account is verified and ready to go.</p>
      ${data.loginUrl ? `
      <div style="margin:24px 0;text-align:center">
        <a href="${data.loginUrl}" style="display:inline-block;padding:14px 28px;background:${data.brandColor || "#1a365d"};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Go to my account
        </a>
      </div>
      ` : ""}
      <p style="margin:0;font-size:13px;color:#6b7280">Thanks for joining us. We're glad to have you.</p>
    `, data.siteName, data.brandColor),
  };
}
