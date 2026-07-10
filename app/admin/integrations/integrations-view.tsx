"use client";

import { useState, useActionState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Code, MessageCircle, BarChart3, Eye, CheckCircle, AlertCircle,
  ExternalLink, CreditCard, Wallet, EyeOff, Copy, Check, Plug, Mail,
  FileSpreadsheet, CalendarDays,
} from "lucide-react";
import type { SiteConfig } from "@/lib/types";
import { CURRENCY_CODE } from "@/lib/currency";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminTheme } from "@/lib/admin-theme";
import { getAdminStyles } from "@/lib/admin-styles";
import { saveIntegration, type SaveResult } from "../_actions/integrations";

// ─── Catalog ───────────────────────────────────────────

export type StoredIntegration = {
  kind: string;
  display_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

type FieldKind = "text" | "password" | "textarea" | "select" | "webhook";

interface Field {
  key: string;
  label: string;
  type: FieldKind;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** For type: "webhook" — appended to the site origin to form the URL */
  webhookPath?: string;
  /** Default value when no stored value exists */
  default?: string;
}

interface IntegrationDef {
  kind: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: "Payments" | "Analytics" | "Messaging" | "Google" | "Custom";
  docsUrl?: string;
  fields: Field[];
}

const CATALOG: IntegrationDef[] = [
  // ─── Payments ────
  {
    kind: "paystack",
    name: "Paystack",
    tagline: "Cards, transfers & USSD for Nigeria",
    description: "Accept card, bank transfer, USSD and Apple/Google Pay payments from Nigerian customers. Best rates for NGN.",
    icon: CreditCard,
    color: "#0BA4DB",
    category: "Payments",
    docsUrl: "https://dashboard.paystack.com/#/settings/developers",
    fields: [
      { key: "mode",         label: "Environment",     type: "select", required: true, default: "test",
        options: [{ value: "test", label: "Test mode" }, { value: "live", label: "Live mode" }] },
      { key: "public_key",   label: "Public Key",      type: "text",     required: true, placeholder: "pk_test_…  or  pk_live_…",
        help: "Used by the booking page to tokenise cards. Safe to expose." },
      { key: "secret_key",   label: "Secret Key",      type: "password", required: true, placeholder: "sk_test_…  or  sk_live_…",
        help: "Server-only. Charges are signed with this key — never paste it into client code." },
      { key: "webhook_url",  label: "Webhook URL",     type: "webhook",  webhookPath: "/api/webhooks/paystack",
        help: "Add this URL inside Paystack → Settings → API Keys & Webhooks → Webhook URL." },
      { key: "currency",     label: "Currency",        type: "select",   default: ["NGN", "GHS", "USD", "ZAR"].includes(CURRENCY_CODE) ? CURRENCY_CODE : "NGN",
        options: [{ value: "NGN", label: "Nigerian Naira (NGN)" }, { value: "GHS", label: "Ghana Cedi (GHS)" }, { value: "USD", label: "US Dollar (USD)" }, { value: "ZAR", label: "South African Rand (ZAR)" }] },
    ],
  },
  {
    kind: "stripe",
    name: "Stripe",
    tagline: "Global cards & wallets",
    description: "Accept card payments, Apple Pay, Google Pay and bank debits from anywhere in the world. Use for international guests.",
    icon: Wallet,
    color: "#635BFF",
    category: "Payments",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    fields: [
      { key: "mode",             label: "Environment",       type: "select", required: true, default: "test",
        options: [{ value: "test", label: "Test mode" }, { value: "live", label: "Live mode" }] },
      { key: "publishable_key",  label: "Publishable Key",   type: "text",     required: true, placeholder: "pk_test_…  or  pk_live_…",
        help: "Safe for the browser — used to mount Stripe Elements." },
      { key: "secret_key",       label: "Secret Key",        type: "password", required: true, placeholder: "sk_test_…  or  sk_live_…",
        help: "Server-only. Used to create PaymentIntents." },
      { key: "webhook_secret",   label: "Webhook Signing Secret", type: "password", placeholder: "whsec_…",
        help: "Find this after registering the webhook URL below in your Stripe dashboard." },
      { key: "webhook_url",      label: "Webhook URL",       type: "webhook",  webhookPath: "/api/webhooks/stripe",
        help: "Add at Stripe → Developers → Webhooks → Add endpoint. Listen for payment_intent.* events." },
      { key: "currency",         label: "Currency",          type: "select",   default: ["USD", "EUR", "GBP", "NGN"].includes(CURRENCY_CODE) ? CURRENCY_CODE : "USD",
        options: [{ value: "USD", label: "US Dollar (USD)" }, { value: "EUR", label: "Euro (EUR)" }, { value: "GBP", label: "British Pound (GBP)" }, { value: "NGN", label: "Nigerian Naira (NGN)" }] },
    ],
  },

  // ─── Analytics ────
  {
    kind: "ga4",
    name: "Google Analytics 4",
    tagline: "Traffic & conversion tracking",
    description: "Track visitors, page views, and conversion events on your site.",
    icon: BarChart3,
    color: "#F59E0B",
    category: "Analytics",
    docsUrl: "https://analytics.google.com",
    fields: [
      { key: "measurement_id", label: "Measurement ID", type: "text", required: true, placeholder: "G-XXXXXXXXXX",
        help: "Google Analytics → Admin → Data Streams → Web stream" },
    ],
  },
  {
    kind: "meta_pixel",
    name: "Meta Pixel",
    tagline: "Facebook + Instagram retargeting",
    description: "Track conversions from Facebook and Instagram ads, build retargeting audiences.",
    icon: Eye,
    color: "#1877F2",
    category: "Analytics",
    docsUrl: "https://business.facebook.com/events_manager",
    fields: [
      { key: "pixel_id", label: "Pixel ID", type: "text", required: true, placeholder: "123456789012345",
        help: "Meta Business Suite → Events Manager → Data Sources" },
    ],
  },
  {
    kind: "gtm",
    name: "Google Tag Manager",
    tagline: "Manage all tags in one place",
    description: "Inject GA4, Pixel, Hotjar and any other tag without redeploying your site.",
    icon: Code,
    color: "#4285F4",
    category: "Analytics",
    fields: [
      { key: "container_id", label: "Container ID", type: "text", required: true, placeholder: "GTM-XXXXXXX" },
    ],
  },

  // ─── Email ────
  {
    kind: "email",
    name: "Email (Resend)",
    tagline: "Booking confirmations & notifications",
    description: "Automatically send booking confirmations, inquiry auto-replies, and admin notifications. Managed by Kodagen by default — add your own Resend API key for a custom sending domain.",
    icon: Mail,
    color: "#000000",
    category: "Messaging",
    docsUrl: "https://resend.com/docs/introduction",
    fields: [
      { key: "api_key",     label: "Resend API Key (optional)",   type: "password", placeholder: "re_xxxxxx…",
        help: "Leave blank to use Kodagen's managed sender. Add your own key to send from your domain." },
      { key: "from_domain", label: "Sending domain (optional)", type: "text", placeholder: "yourdomain.com",
        help: "Must be verified in Resend. Defaults to kodagen.com if blank." },
    ],
  },

  // ─── Messaging ────
  {
    kind: "whatsapp",
    name: "WhatsApp Chat",
    tagline: "Floating chat button",
    description: "Show a green WhatsApp button bottom-right — guests can message you directly.",
    icon: MessageCircle,
    color: "#25D366",
    category: "Messaging",
    fields: [
      { key: "number",   label: "WhatsApp Number", type: "text", required: true, placeholder: "+234 801 234 5678",
        help: "Include the country code." },
      { key: "greeting", label: "Greeting Message", type: "text", placeholder: "Hello! How can we help you today?" },
    ],
  },
  {
    kind: "tawkto",
    name: "Tawk.to Live Chat",
    tagline: "Free live chat for staff",
    description: "Embed Tawk.to so reception can chat with website visitors in real time.",
    icon: MessageCircle,
    color: "#03C74A",
    category: "Messaging",
    docsUrl: "https://dashboard.tawk.to",
    fields: [
      { key: "widget_id", label: "Property ID / Widget ID", type: "text", required: true, placeholder: "xxxxxxxxxxxxxxx/xxxxxxxxxx" },
    ],
  },


  // ─── Google ────
  {
    kind: "google_sheets",
    name: "Google Sheets",
    tagline: "Bookings & leads → spreadsheet",
    description: "Every new booking and inquiry is appended as a row in your spreadsheet — a live log your team can filter, share, and build on.",
    icon: FileSpreadsheet,
    color: "#0F9D58",
    category: "Google",
    docsUrl: "https://console.cloud.google.com/iam-admin/serviceaccounts",
    fields: [
      { key: "service_account_json", label: "Service account key (JSON)", type: "textarea", required: true,
        placeholder: '{ "type": "service_account", "client_email": "...", "private_key": "..." }',
        help: "Google Cloud Console → IAM → Service Accounts → Keys → Add key (JSON). Then SHARE the spreadsheet with the service account's email (Editor)." },
      { key: "spreadsheet_id", label: "Spreadsheet ID", type: "text", required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        help: "The long ID in the sheet's URL: docs.google.com/spreadsheets/d/<ID>/edit" },
      { key: "sheet_name", label: "Tab name", type: "text", placeholder: "Sheet1",
        help: "Which tab rows are appended to. Defaults to Sheet1." },
    ],
  },
  {
    kind: "google_calendar",
    name: "Google Calendar",
    tagline: "Appointments on your calendar",
    description: "Every confirmed appointment is added to your Google Calendar automatically, so your team's schedule always matches the website.",
    icon: CalendarDays,
    color: "#4285F4",
    category: "Google",
    docsUrl: "https://console.cloud.google.com/iam-admin/serviceaccounts",
    fields: [
      { key: "service_account_json", label: "Service account key (JSON)", type: "textarea", required: true,
        placeholder: '{ "type": "service_account", "client_email": "...", "private_key": "..." }',
        help: "Google Cloud Console → IAM → Service Accounts → Keys → Add key (JSON). Then SHARE your calendar with the service account's email (Make changes to events)." },
      { key: "calendar_id", label: "Calendar ID", type: "text", required: true,
        placeholder: "yourbusiness@gmail.com",
        help: "Google Calendar → Settings → your calendar → 'Calendar ID' (often your Gmail address)." },
      { key: "timezone", label: "Time zone", type: "text", placeholder: "Africa/Lagos",
        help: "IANA time zone for the events. Defaults to UTC." },
    ],
  },

  // ─── Custom ────
  {
    kind: "custom_script",
    name: "Custom <head> Code",
    tagline: "Inject anything into the site head",
    description: "Paste meta tags, fonts, third-party scripts. Injected on every page.",
    icon: Code,
    color: "#6B7280",
    category: "Custom",
    fields: [
      { key: "script", label: "Head HTML", type: "textarea", placeholder: "<!-- e.g. third-party verification meta tag -->" },
    ],
  },
  {
    kind: "body_script",
    name: "Custom <body> Code",
    tagline: "Inject before </body>",
    description: "Paste tracking scripts that need to run after the page loads.",
    icon: Code,
    color: "#6B7280",
    category: "Custom",
    fields: [
      { key: "script", label: "Body HTML", type: "textarea", placeholder: "<!-- e.g. heatmap or live-chat script -->" },
    ],
  },
];

const CATEGORY_ORDER: IntegrationDef["category"][] = ["Payments", "Analytics", "Messaging", "Google", "Custom"];

// ─── Which integrations show up-front ─────────────────
// The platform writes NEXT_PUBLIC_ENABLED_INTEGRATIONS at provisioning from
// what the customer actually asked for (their payment provider, WhatsApp,
// chat, Google tools). Those + core basics + anything already configured are
// shown; the rest stays reachable behind "Browse more integrations" so we
// don't pitch Stripe to a Paystack business or chat widgets nobody asked for.
const CORE_KINDS = new Set(["email", "ga4"]);
const ENABLED_KINDS = new Set(
  (process.env.NEXT_PUBLIC_ENABLED_INTEGRATIONS ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean),
);
// No list (older builds) → show everything, as before.
const HAS_ENABLED_LIST = ENABLED_KINDS.size > 0;

// ─── Per-integration form ─────────────────────────────

function IntegrationForm({
  def, stored, origin, businessName, contactPhone,
}: {
  def: IntegrationDef;
  stored?: StoredIntegration;
  origin: string;
  businessName: string;
  contactPhone: string;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);

  const [enabled, setEnabled] = useState(stored?.enabled ?? false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of def.fields) {
      const stored_v = stored?.config?.[f.key];
      seed[f.key] =
        typeof stored_v === "string" ? stored_v
        : f.default ?? defaultValueFor(def.kind, f.key, businessName, contactPhone);
    }
    return seed;
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [state, action, pending] = useActionState<SaveResult | null, FormData>(saveIntegration, null);

  // Reset form values from props when the active tab changes
  useEffect(() => {
    setEnabled(stored?.enabled ?? false);
    setValues(() => {
      const seed: Record<string, string> = {};
      for (const f of def.fields) {
        const stored_v = stored?.config?.[f.key];
        seed[f.key] =
          typeof stored_v === "string" ? stored_v
          : f.default ?? defaultValueFor(def.kind, f.key, businessName, contactPhone);
      }
      return seed;
    });
    setRevealed({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.kind]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  // Build the payload — webhook fields aren't user-editable, omit them so the
  // server doesn't get confused with read-only data.
  const configPayload = Object.fromEntries(
    def.fields.filter((f) => f.type !== "webhook").map((f) => [f.key, values[f.key] ?? ""]),
  );

  const isPayment = def.category === "Payments";

  return (
    <form action={action} className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-6 space-y-5`}>
      <input type="hidden" name="kind" value={def.kind} />
      <input type="hidden" name="display_name" value={def.name} />
      <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />
      <input type="hidden" name="config" value={JSON.stringify(configPayload)} />

      {/* Header strip */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${def.color}18` }}>
          <div style={{ color: def.color }}><def.icon className="w-6 h-6" /></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>{def.name}</h2>
            {enabled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 ring-1 ring-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
              </span>
            )}
            {isPayment && values.mode === "test" && enabled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30">
                Test mode
              </span>
            )}
          </div>
          <p className={`text-sm font-medium ${s.textSecondary}`}>{def.tagline}</p>
          <p className={`text-xs ${s.textMuted} mt-1`}>{def.description}</p>
        </div>

        {/* Enable toggle */}
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0`}
          style={{ background: enabled ? def.color : dark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}
          aria-label={enabled ? "Disable" : "Enable"}
        >
          <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${enabled ? "left-[20px]" : "left-[3px]"}`} />
        </button>
      </div>

      {/* Save banner */}
      <AnimatePresence>
        {state && (
          state.ok ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-700"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Saved · changes are live.
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
            >
              <AlertCircle className="w-3.5 h-3.5" /> {state.error}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Fields */}
      <div className="space-y-4">
        {def.fields.map((f) => (
          <div key={f.key}>
            <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5 ${s.textLabel}`}>
              {f.label}
              {f.required && <span className="text-red-500">*</span>}
            </label>

            {f.type === "select" ? (
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm cursor-pointer focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
                style={{ ["--tw-ring-color" as string]: def.color }}
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                rows={4}
                placeholder={f.placeholder}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono resize-y focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
                style={{ ["--tw-ring-color" as string]: def.color }}
              />
            ) : f.type === "password" ? (
              <div className="relative">
                <input
                  type={revealed[f.key] ? "text" : "password"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className={`w-full pl-3 pr-20 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
                  style={{ ["--tw-ring-color" as string]: def.color }}
                  autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setRevealed((r) => ({ ...r, [f.key]: !r[f.key] }))}
                    className={`p-1.5 rounded-md ${s.hoverBg} ${s.textSecondary}`}
                    title={revealed[f.key] ? "Hide" : "Show"}>
                    {revealed[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {values[f.key] && (
                    <button type="button" onClick={() => copy(values[f.key], f.key)}
                      className={`p-1.5 rounded-md ${s.hoverBg} ${s.textSecondary}`}
                      title="Copy">
                      {copied === f.key ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ) : f.type === "webhook" ? (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${s.inputBg} font-mono text-xs`}>
                <span className={`flex-1 truncate ${s.textSecondary}`}>{origin}{f.webhookPath}</span>
                <button type="button" onClick={() => copy(`${origin}${f.webhookPath}`, f.key)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold ${s.hoverBg} ${s.textSecondary} flex items-center gap-1`}
                  title="Copy webhook URL">
                  {copied === f.key ? (<><Check className="w-3 h-3 text-green-500" /> Copied</>) : (<><Copy className="w-3 h-3" /> Copy</>)}
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 ${s.inputBg} ${s.inputRing}`}
                style={{ ["--tw-ring-color" as string]: def.color }}
                autoComplete="off"
              />
            )}

            {f.help && (
              <p className={`text-[11px] mt-1.5 flex items-start gap-1 ${s.textMuted}`}>
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {f.help}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={`flex items-center justify-between pt-4 border-t ${s.borderLight}`}>
        {def.docsUrl ? (
          <a href={def.docsUrl} target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.textSecondary} hover:opacity-70`}>
            <ExternalLink className="w-3.5 h-3.5" />
            {def.name} dashboard
          </a>
        ) : <span />}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition hover:scale-[1.02] disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${def.color}, ${def.color}cc)` }}
        >
          <Save className="w-4 h-4" /> {pending ? "Saving…" : `Save ${def.name}`}
        </button>
      </div>
    </form>
  );
}

// Sensible defaults (e.g. WhatsApp number = the contact phone you already saved)
function defaultValueFor(kind: string, fieldKey: string, businessName: string, contactPhone: string): string {
  if (kind === "whatsapp" && fieldKey === "number")   return contactPhone;
  if (kind === "whatsapp" && fieldKey === "greeting") return `Hello! Welcome to ${businessName}, how can we help?`;
  return "";
}

// ─── Main ──────────────────────────────────────────────

function IntegrationsInner({
  config, stored, origin,
}: {
  config: SiteConfig;
  stored: Record<string, StoredIntegration>;
  origin: string;
}) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const s = getAdminStyles(dark);
  const [showAll, setShowAll] = useState(false);

  const isRequested = (def: IntegrationDef) =>
    !HAS_ENABLED_LIST || CORE_KINDS.has(def.kind) || ENABLED_KINDS.has(def.kind) || Boolean(stored[def.kind]);
  const visible = CATALOG.filter((c) => showAll || isRequested(c));
  const hiddenCount = CATALOG.length - CATALOG.filter(isRequested).length;

  const [activeKind, setActiveKind] = useState<string>((visible[0] ?? CATALOG[0]).kind);

  const activeDef = CATALOG.find((c) => c.kind === activeKind) ?? visible[0] ?? CATALOG[0];

  // Group catalog entries by category for the side rail
  const grouped: Record<string, IntegrationDef[]> = {};
  for (const c of visible) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  return (
    <div className="p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
      <div>
        <h1 className={`text-2xl font-bold ${s.textPrimary}`}>Integrations</h1>
        <p className={`text-sm mt-1 ${s.textSecondary}`}>Connect payments, analytics, chat widgets and tracking codes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Side rail */}
        <aside className={`${s.cardBg} rounded-2xl border ${s.cardBorder} p-2 h-fit lg:sticky lg:top-4`}>
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat} className="mb-2 last:mb-0">
              <p className={`px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ${s.textMuted}`}>
                {cat}
              </p>
              <div className="space-y-0.5">
                {grouped[cat].map((def) => {
                  const Icon = def.icon;
                  const active = activeKind === def.kind;
                  const isEnabled = stored[def.kind]?.enabled;
                  return (
                    <button
                      key={def.kind}
                      type="button"
                      onClick={() => setActiveKind(def.kind)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                        active ? `${dark ? "bg-white/[0.06]" : "bg-gray-100"}` : s.hoverBg
                      }`}
                      style={active ? { boxShadow: `inset 0 0 0 1px ${def.color}55` } : undefined}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${def.color}18` }}>
                        <div style={{ color: def.color }}><Icon className="w-3.5 h-3.5" /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${s.textPrimary}`}>{def.name}</p>
                        <p className={`text-[10px] truncate ${s.textMuted}`}>{def.tagline}</p>
                      </div>
                      {isEnabled && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Live" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={`w-full mt-1 px-3 py-2.5 rounded-xl text-left text-[11px] font-semibold transition ${s.hoverBg} ${s.textSecondary}`}
            >
              {showAll ? "Show only my integrations" : `Browse more integrations (${hiddenCount})`}
            </button>
          )}
        </aside>

        {/* Active form */}
        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeKind}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <IntegrationForm
                def={activeDef}
                stored={stored[activeDef.kind]}
                origin={origin}
                businessName={config.businessName}
                contactPhone={config.contact.phone}
              />
            </motion.div>
          </AnimatePresence>

          {/* Quick connect strip — only on Payments tabs */}
          {activeDef.category === "Payments" && (
            <div className={`mt-4 ${s.cardBg} rounded-2xl border ${s.cardBorder} p-4 flex items-start gap-3`}>
              <Plug className={`w-4 h-4 mt-0.5 ${s.textMuted}`} />
              <div className="text-xs space-y-1">
                <p className={`font-semibold ${s.textPrimary}`}>How payments hook up to bookings</p>
                <p className={s.textMuted}>
                  Once enabled with valid keys, the booking modal initialises a {activeDef.name} payment
                  before the reservation is confirmed. The webhook URL above tells {activeDef.name} where
                  to notify your site when a payment succeeds — paste it inside the {activeDef.name} dashboard.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function IntegrationsView({
  config, counts, stored, origin,
}: {
  config: SiteConfig;
  counts?: { bookings: number; inquiries: number };
  stored: Record<string, StoredIntegration>;
  origin: string;
}) {
  return (
    <AdminShell config={config} counts={counts}>
      <IntegrationsInner config={config} stored={stored} origin={origin} />
    </AdminShell>
  );
}
