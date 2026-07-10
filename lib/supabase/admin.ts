// lib/supabase/admin.ts
//
// Service-role Supabase client.
// USE WITH EXTREME CAUTION — bypasses Row Level Security and Auth checks.
// Only call from Server Actions or Route Handlers, NEVER from Client Components.
//
// Used for admin operations on customers:
//   - supabase.auth.admin.updateUserById(userId, { ban_duration: '...' })
//   - supabase.auth.admin.deleteUser(userId)
//   - supabase.auth.admin.signOut(userId, 'global')   — force-logout
//   - supabase.auth.admin.generateLink({ type, email })
//   - bypassing RLS to write to admin_audit_logs and customer_admin_actions

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
