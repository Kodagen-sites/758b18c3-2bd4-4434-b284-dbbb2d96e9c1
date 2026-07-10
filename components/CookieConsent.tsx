"use client";

import { useEffect, useState } from "react";

/**
 * CookieConsent — GDPR/ePrivacy consent banner for generated sites.
 *
 * Two variants:
 *   "floating" (default) — compact card pinned bottom-LEFT (bottom-right is
 *                          reserved for the WhatsApp widget).
 *   "bar"                — standard full-width bottom bar.
 *
 * The visitor's choice is persisted to localStorage AND a first-party cookie
 * (`cookie_consent`) so server components can read it, then broadcast via a
 * `cookie-consent-change` event so script gates (analytics, pixels) can react
 * without a reload. Renders nothing until mounted — no SSR hydration mismatch.
 */

export type CookieConsentStatus = "accepted" | "declined";

const STORAGE_KEY = "cookie-consent";
export const CONSENT_COOKIE = "cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // re-prompt after ~6 months
const CHANGE_EVENT = "cookie-consent-change";

export function getCookieConsent(): CookieConsentStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "declined") return v;
  } catch {
    /* storage blocked — fall through to cookie */
  }
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(accepted|declined)`));
  return m ? (m[1] as CookieConsentStatus) : null;
}

export function onCookieConsentChange(cb: (status: CookieConsentStatus) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<CookieConsentStatus>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

function persist(status: CookieConsentStatus) {
  try {
    window.localStorage.setItem(STORAGE_KEY, status);
  } catch {
    /* private mode — cookie below still works */
  }
  document.cookie = `${CONSENT_COOKIE}=${status}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<CookieConsentStatus>(CHANGE_EVENT, { detail: status }));
}

export function CookieConsent({
  variant = "floating",
  privacyHref = "/privacy",
  message = "We use cookies to keep this site working and to understand how it's used. You can accept or decline non-essential cookies.",
}: {
  variant?: "floating" | "bar";
  privacyHref?: string;
  message?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() !== null) return;
    // Delay past first paint so the banner never competes with LCP.
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  function choose(status: CookieConsentStatus) {
    persist(status);
    setVisible(false);
  }

  const buttons = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        onClick={() => choose("declined")}
        className="rounded-full border border-zinc-300 px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:text-zinc-900"
      >
        Decline
      </button>
      <button
        onClick={() => choose("accepted")}
        className="rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Accept
      </button>
    </div>
  );

  const text = (
    <p className="text-[13px] leading-relaxed text-zinc-600">
      {message}{" "}
      <a href={privacyHref} className="whitespace-nowrap font-medium text-zinc-900 underline underline-offset-2">
        Privacy policy
      </a>
    </p>
  );

  if (variant === "bar") {
    return (
      <div
        role="dialog"
        aria-label="Cookie consent"
        className="fixed inset-x-0 bottom-0 z-[70] border-t border-black/10 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur"
      >
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-10">
          {text}
          {buttons}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-5 left-5 z-[70] w-[calc(100vw-40px)] max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/10"
    >
      <p className="mb-1 text-sm font-semibold text-zinc-900">Cookies</p>
      <div className="mb-4">{text}</div>
      {buttons}
    </div>
  );
}
