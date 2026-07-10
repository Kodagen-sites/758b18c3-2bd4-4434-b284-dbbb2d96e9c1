// proxy.ts — Next.js 16 successor to middleware.ts
//
// Gates /admin/* routes. Unauthenticated requests are redirected to
// /admin/login; accounts still carrying the provisioning-set
// must_change_password flag are locked to /admin/change-password until
// they rotate the generated credential. Public routes pass through
// unchanged.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — essential for keeping users logged in
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname.startsWith("/admin/login");
  const isAuthCallback = pathname.startsWith("/admin/auth");

  // Redirect unauthenticated users hitting /admin/* to login
  // Exception: /admin/login and /admin/auth/callback are always accessible
  if (isAdminRoute && !user && !isLoginRoute && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in user hitting /admin/login → redirect to /admin
  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Generated-password accounts can't use the admin (pages or server
  // actions — both route through here) until they set their own password.
  // getUser() reads metadata from the auth server, so the flag can't be
  // spoofed by editing cookies.
  if (isAdminRoute && user && !isAuthCallback) {
    const mustChange = Boolean(user.user_metadata?.must_change_password);
    const isChangePassword = pathname.startsWith("/admin/change-password");
    if (mustChange && !isChangePassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/change-password";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (!mustChange && isChangePassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * Feel free to modify to add more public routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
