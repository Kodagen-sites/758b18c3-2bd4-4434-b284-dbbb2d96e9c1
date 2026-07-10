"use client";

// Forced first-login password rotation. proxy.ts locks every /admin route
// (pages and server actions) to this page while the provisioning-set
// `user_metadata.must_change_password` flag is on the account, so this is a
// real server-side gate — not a dismissible overlay. Clearing the flag here
// is what unlocks the admin.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const supabase = createClient();
  const [currentEmail, setCurrentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) setCurrentEmail(data.user.email ?? "");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) { setError("Use at least 10 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    try {
      // Password + flag clear in one call. Email (if changed) goes second —
      // Supabase emails a confirmation link to the new address, so the
      // account keeps working via the old email until the owner confirms.
      const { error: pwErr } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (pwErr) throw pwErr;
      const wantsEmail = newEmail.trim() && newEmail.trim().toLowerCase() !== currentEmail.toLowerCase();
      if (wantsEmail) {
        await supabase.auth.updateUser({ email: newEmail.trim() });
      }
      // Full navigation so proxy.ts re-reads the cleared flag.
      window.location.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the password — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Set your password</h1>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="cp-password">New password</label>
            <input
              id="cp-password" type="password" autoComplete="new-password" required minLength={10} autoFocus
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="cp-confirm">Confirm password</label>
            <input
              id="cp-confirm" type="password" autoComplete="new-password" required minLength={10}
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="cp-email">
              Email <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="cp-email" type="email" autoComplete="email" placeholder={currentEmail}
              value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit" disabled={saving}
            className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
