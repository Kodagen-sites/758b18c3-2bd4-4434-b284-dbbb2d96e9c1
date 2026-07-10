"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * - Reads PUBLIC env vars (the anon key is safe to expose).
 * - Sessions live in HttpOnly cookies set by the server actions / middleware.
 * - All queries are still RLS-enforced server-side.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
