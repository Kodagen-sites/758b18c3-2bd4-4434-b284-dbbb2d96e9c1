// lib/currency.ts
//
// Single source of truth for money formatting in the admin + API routes.
// The platform appends NEXT_PUBLIC_CURRENCY to .env.local at provisioning
// (taken from the built site's siteConfig.currency) and deploy mirrors it to
// Vercel, so this is correct in client components too (inlined at build).
// NEVER hardcode a currency symbol in a view — import from here.

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh ", GHS: "GH₵",
  ZAR: "R", CAD: "CA$", AUD: "A$", JPY: "¥", CNY: "¥", INR: "₹",
  BRL: "R$", MXN: "MX$", CHF: "CHF ", SEK: "kr ", NOK: "kr ", DKK: "kr ",
};

export const CURRENCY_CODE: string =
  (process.env.NEXT_PUBLIC_CURRENCY || "USD").toUpperCase();

export const CURRENCY_SYMBOL: string =
  SYMBOLS[CURRENCY_CODE] ?? `${CURRENCY_CODE} `;

/** Format a major-unit amount: fmtMoney(1250) → "$1,250" */
export function fmtMoney(amount: number | string, code?: string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const c = (code ?? CURRENCY_CODE).toUpperCase();
  const sym = SYMBOLS[c] ?? `${c} `;
  if (!Number.isFinite(n)) return `${sym}0`;
  return `${sym}${n.toLocaleString()}`;
}

/** Format an integer minor-unit amount, receipt style: fmtMoneyCents(125050) → "$1,250.50" */
export function fmtMoneyCents(cents: number | string, code?: string): string {
  const n = typeof cents === "string" ? Number(cents) : cents;
  const c = (code ?? CURRENCY_CODE).toUpperCase();
  const sym = SYMBOLS[c] ?? `${c} `;
  if (!Number.isFinite(n)) return `${sym}0.00`;
  return `${sym}${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
