"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getCookieConsent, onCookieConsentChange } from "./CookieConsent";

/**
 * ConsentGate — renders children only after the visitor has ACCEPTED cookies
 * via <CookieConsent />. Wraps non-essential third-party script injection
 * (GA4, Meta Pixel, GTM) so nothing loads pre-consent, and loads it live the
 * moment the visitor clicks Accept (no reload needed).
 *
 * Limitation (standard for consent gates): scripts already loaded in this
 * page session are not unloaded if consent is later withdrawn — they simply
 * stop being injected from the next navigation onward.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(getCookieConsent() === "accepted");
    return onCookieConsentChange((status) => setConsented(status === "accepted"));
  }, []);

  if (!consented) return null;
  return <>{children}</>;
}
