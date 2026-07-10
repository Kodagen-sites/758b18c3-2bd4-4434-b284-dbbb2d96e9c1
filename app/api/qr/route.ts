import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";

/**
 * Generates a QR code as a PNG data URL.
 * GET /api/qr?text=https://hotel.com/room/Room%20201&size=300
 */
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  const size = Math.min(1000, Math.max(100, Number(request.nextUrl.searchParams.get("size") ?? 300)));

  if (!text) {
    return NextResponse.json({ ok: false, error: "Missing text parameter" }, { status: 400 });
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    return NextResponse.json({ ok: true, dataUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
