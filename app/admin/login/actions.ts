"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server actions for the admin login page.
 *
 * Email + password auth via Supabase Auth — sessions land in HttpOnly
 * cookies via the SSR client. The proxy refreshes them on every request
 * and gates /admin.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function signInWithPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { ok: false, error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: error.message };
  redirect("/admin");
}

export async function sendPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };

  const supabase = await createClient();
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/admin/auth/callback?next=/admin/settings`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, message: `Reset link sent to ${email}.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
