import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link / password-reset callback.
 * Supabase redirects here after the user clicks the link in their email.
 * We exchange the code for a session, set the HttpOnly cookies, and bounce
 * to the originally-requested admin route.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback if exchange failed
  return NextResponse.redirect(`${origin}/admin/login?error=auth-failed`);
}
