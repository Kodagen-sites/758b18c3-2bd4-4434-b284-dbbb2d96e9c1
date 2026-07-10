import { DB_MODE, KODAGEN_SCHEMA, withSchema } from '@/lib/db-scope';
// lib/supabase/middleware.ts
//
// Auth middleware — runs on every request to refresh sessions and gate
// /admin/* (staff) and /account/* (customers).
//
// IMPORTANT: do NOT set ANY cookies between createServerClient() and
// supabase.auth.getUser(). The auth library races on cookie writes when
// refreshing tokens.
//
// Customer status check:
//   When a customer hits /account/*, we check customer_profiles.status.
//   - active: pass through
//   - suspended/banned: redirect to /account/suspended
//   - shadow_banned: pass through (logged-in but reduced privileges enforced
//                    in pages/Server Actions)
//   - pending_verification: pass through (they need /account to nudge them)
//
// Token version invalidation (force-logout):
//   When admin force-logs-out a customer, we also call
//   supabase.auth.admin.signOut(userId, 'global') which invalidates all
//   sessions at the Supabase level. The customer's next request hits
//   getUser() and returns null. They get redirected to /account/login.
//   No token_version field needed — Supabase handles globally.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — must be the first auth call after createServerClient.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  
  // ─── Admin route gating ──────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/admin/login" && user) {
    // Verify they're actually staff (in user_sites) before bouncing them into /admin
    const { data: userSite } = await withSchema(supabase, KODAGEN_SCHEMA)
      .from("user_sites")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (userSite) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.delete("next");
      return NextResponse.redirect(url);
    }
    // If they're a customer (not staff), they shouldn't see /admin/login at all,
    // but it's not worth blocking — let them try.
  }
  
  // ─── Customer account route gating ───────────────────────────────────
  const PUBLIC_ACCOUNT_ROUTES = [
    "/account/login",
    "/account/signup",
    "/account/forgot-password",
    "/account/reset-password",
    "/account/verify-email",
    "/account/auth/callback",
    "/account/suspended",
  ];
  
  const isAccountRoute = pathname.startsWith("/account");
  const isPublicAccountRoute = PUBLIC_ACCOUNT_ROUTES.some(r =>
    pathname === r || pathname.startsWith(r + "/")
  );
  const isProtectedAccountRoute = isAccountRoute && !isPublicAccountRoute;
  
  if (isProtectedAccountRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  
  // Already-logged-in customer hitting login/signup → bounce to dashboard
  if ((pathname === "/account/login" || pathname === "/account/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }
  
  // ─── Customer status check (suspended/banned redirect) ───────────────
  // Only check on protected account routes — prevents an extra DB query on every
  // public page request. The /account/suspended page itself doesn't redirect again.
  if (isProtectedAccountRoute && user && pathname !== "/account/suspended") {
    let status: string | null = null;
    if (DB_MODE === "shared") {
      // Shared DB2: the caller may have customer_profiles rows at several
      // tenant sites, and the table lives in the `kodagen` schema. A plain
      // select would hit the wrong schema and mis-resolve across sites, so
      // resolve status via a security-definer RPC scoped to (auth.uid(), this
      // site's slug). This is what makes a suspend/ban act ONLY on this site.
      const { data } = await withSchema(supabase, KODAGEN_SCHEMA)
        .rpc("customer_status_for_site", { p_slug: process.env.NEXT_PUBLIC_SITE_SLUG });
      status = (data as string | null) ?? null;
    } else {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      status = profile?.status ?? null;
    }

    if (status === "suspended" || status === "banned" || status === "deleted_soft") {
      const url = request.nextUrl.clone();
      url.pathname = "/account/suspended";
      url.searchParams.delete("next");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
