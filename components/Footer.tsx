import Link from "next/link";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/content/site-config";
import { SocialLinks } from "@/components/social-icons";

/**
 * Footer with 5 distinct, per-build-rolled layouts (FT1–FT5).
 *
 * WHY A PICKER: there used to be ONE footer, so every generated site shipped
 * the identical footer regardless of brand. The variant is now rolled per build
 * by scripts/roll-variants.ts (seeded on the projectId) and written to
 * `siteConfig.footerVariant`; this component renders the matching layout — the
 * same mechanism headers use (headers/Header.tsx). All variants read ONLY the
 * proven site-config schema (company / socials / services) so they're drop-in.
 *
 * Add/adjust a layout here, then keep FOOTER_VARIANTS in roll-variants.ts in
 * sync with the ids below.
 */

const year = new Date().getFullYear();

// Standard nav + legal links shared by every variant. (Inner-page routes; on a
// single-page `landing` build, swap these for `#anchor` hrefs at scaffold time.)
const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
  { href: "/contact", label: "Contact" },
];
const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

function ServiceLinks({ limit = 5 }: { limit?: number }) {
  return (
    <ul className="space-y-2 text-sm text-white/70">
      {siteConfig.services.slice(0, limit).map((svc) => (
        <li key={svc.slug}>
          <Link href={`/services/${svc.slug}`} className="hover:text-white transition-colors">
            {svc.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ContactList() {
  const { email, phone, location } = siteConfig.company;
  return (
    <ul className="space-y-3 text-sm text-white/70">
      {email && (
        <li className="flex items-start gap-2">
          <Mail size={14} className="mt-0.5 text-primary flex-shrink-0" />
          <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
        </li>
      )}
      {phone && (
        <li className="flex items-start gap-2">
          <Phone size={14} className="mt-0.5 text-primary flex-shrink-0" />
          <a href={`tel:${phone}`} className="hover:text-white">{phone}</a>
        </li>
      )}
      {location && (
        <li className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 text-primary flex-shrink-0" />
          <span>{location}</span>
        </li>
      )}
    </ul>
  );
}

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{children}</h4>
  );
}

function BottomBar({ center = false }: { center?: boolean }) {
  return (
    <div
      className={`mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row gap-4 text-xs text-white/40 font-mono ${
        center ? "items-center justify-center text-center md:flex-col md:gap-3" : "justify-between"
      }`}
    >
      <div>© {year} {siteConfig.company.name}. All rights reserved.</div>
      <div className="flex gap-6">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-white/70">{l.label}</Link>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <footer className="relative z-20 bg-bg border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">{children}</div>
    </footer>
  );
}

// ── FT1 — Classic 5-column (brand + services + company + contact) ──
function FooterFT1() {
  return (
    <Shell>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="font-display font-bold tracking-[0.15em] uppercase text-lg text-white">
            {siteConfig.company.name}
          </div>
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">
            {siteConfig.company.description}
          </p>
          <SocialLinks socials={siteConfig.socials} className="pt-4 gap-4 text-white/80" iconClassName="h-5 w-5" />
        </div>
        <div className="space-y-4"><ColHeading>Services</ColHeading><ServiceLinks /></div>
        <div className="space-y-4">
          <ColHeading>Company</ColHeading>
          <ul className="space-y-2 text-sm text-white/70">
            {COMPANY_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4"><ColHeading>Contact</ColHeading><ContactList /></div>
      </div>
      <BottomBar />
    </Shell>
  );
}

// ── FT2 — Asymmetric editorial (wide brand block + two link columns) ──
function FooterFT2() {
  return (
    <Shell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-5">
          <div className="font-display font-bold text-3xl text-white">{siteConfig.company.name}</div>
          <p className="text-base text-white/65 leading-relaxed max-w-md">
            {siteConfig.company.description}
          </p>
          <SocialLinks socials={siteConfig.socials} className="pt-2 gap-4 text-white/80" iconClassName="h-5 w-5" />
        </div>
        <div className="lg:col-span-3 lg:col-start-8 space-y-4"><ColHeading>Services</ColHeading><ServiceLinks /></div>
        <div className="lg:col-span-2 space-y-4"><ColHeading>Contact</ColHeading><ContactList /></div>
      </div>
      <BottomBar />
    </Shell>
  );
}

// ── FT3 — Giant wordmark (oversized brand name + minimal links) ──
function FooterFT3() {
  return (
    <Shell>
      <div
        className="font-display font-bold uppercase tracking-tight text-white leading-[0.9]"
        style={{ fontSize: "clamp(48px, 12vw, 200px)" }}
      >
        {siteConfig.company.name}
      </div>
      <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/70">
          {[...COMPANY_LINKS, { href: "/services", label: "Services" }].map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">{l.label}</Link>
          ))}
        </nav>
        <SocialLinks socials={siteConfig.socials} className="gap-4 text-white/80" iconClassName="h-5 w-5" />
      </div>
      <BottomBar />
    </Shell>
  );
}

// ── FT4 — Centered minimal (logo center, nav row, socials, single line) ──
function FooterFT4() {
  return (
    <Shell>
      <div className="flex flex-col items-center text-center gap-6">
        <div className="font-display font-bold tracking-[0.2em] uppercase text-xl text-white">
          {siteConfig.company.name}
        </div>
        <p className="text-sm text-white/60 max-w-lg leading-relaxed">{siteConfig.company.description}</p>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/70">
          {[{ href: "/services", label: "Services" }, ...COMPANY_LINKS].map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">{l.label}</Link>
          ))}
        </nav>
        <SocialLinks socials={siteConfig.socials} className="gap-5 text-white/80" iconClassName="h-5 w-5" />
      </div>
      <BottomBar center />
    </Shell>
  );
}

// ── FT5 — CTA block on top, then compact columns ──
function FooterFT5() {
  const primaryCta = siteConfig.services[0]
    ? { href: "/contact", label: "Get in touch" }
    : { href: "/contact", label: "Contact us" };
  return (
    <Shell>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-12 border-b border-white/10">
        <h3 className="font-display font-semibold text-2xl md:text-3xl text-white max-w-xl leading-tight">
          {siteConfig.company.description}
        </h3>
        <Link
          href={primaryCta.href}
          className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition"
        >
          {primaryCta.label}<ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pt-12">
        <div className="space-y-4">
          <div className="font-display font-bold tracking-[0.15em] uppercase text-white">{siteConfig.company.name}</div>
          <SocialLinks socials={siteConfig.socials} className="gap-4 text-white/80" iconClassName="h-5 w-5" />
        </div>
        <div className="space-y-4"><ColHeading>Services</ColHeading><ServiceLinks limit={4} /></div>
        <div className="space-y-4">
          <ColHeading>Company</ColHeading>
          <ul className="space-y-2 text-sm text-white/70">
            {COMPANY_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4"><ColHeading>Contact</ColHeading><ContactList /></div>
      </div>
      <BottomBar />
    </Shell>
  );
}

const FOOTER_VARIANTS: Record<string, () => React.JSX.Element> = {
  FT1: FooterFT1,
  FT2: FooterFT2,
  FT3: FooterFT3,
  FT4: FooterFT4,
  FT5: FooterFT5,
};

export default function Footer() {
  // `footerVariant` is rolled by roll-variants.ts and written into site-config.
  // Unknown / unset → FT1 (the classic 5-column), so a build that forgets to set
  // it still renders a sensible footer rather than crashing.
  const variant = (siteConfig as any).footerVariant as string | undefined;
  const Variant = (variant && FOOTER_VARIANTS[variant]) || FooterFT1;
  return <Variant />;
}
