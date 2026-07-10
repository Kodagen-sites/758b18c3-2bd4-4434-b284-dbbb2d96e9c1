// components/seo/SEOHead.tsx — Next.js App Router edition
//
// Per-page SEO helper. Two jobs:
//   1. JSON-LD structured data — rendered as <script type="application/ld+json">
//      directly in the markup, so it server-renders into the static HTML
//      (client components still SSR in Next; crawlers see it without JS).
//   2. Title / description / OG / Twitter / canonical / robots — patched into
//      <head> client-side after hydrate. This is a SAFETY NET, not the primary
//      mechanism: App Router pages must ALSO `export const metadata` (or
//      `generateMetadata`) so those tags exist in the crawler-visible HTML.
//
// Usage in a page component:
//
//   import { SEOHead } from "@/components/seo/SEOHead";
//   import { serviceSchema } from "@/lib/seo/structured-data";
//
//   export const metadata = { title: "...", description: "..." };   // ALWAYS
//
//   export default function ServiceDetail({ params }) {
//     const service = siteConfig.services.find(s => s.slug === params.slug);
//     return (
//       <>
//         <SEOHead
//           title={`${service.name} — ${siteConfig.company.name}`}
//           description={service.description}
//           path={`/services/${params.slug}`}
//           jsonLd={serviceSchema({ service, brand: siteConfig.company })}
//         />
//         {/* page content */}
//       </>
//     );
//   }
"use client";

import { useEffect } from "react";
import { siteConfig } from "@/content/site-config";

type Props = {
  /** Full page title — typically "Page name — Brand". Falls back to brand default. */
  title?: string;

  /** Page-specific meta description (140-160 chars ideal). */
  description?: string;

  /** Absolute or relative path of this page (used for canonical + OG URL). */
  path?: string;

  /** Page-specific OG image URL (defaults to siteConfig.seo.defaultOgImage). */
  ogImage?: string;

  /** Set to true for thank-you / login / admin pages where we don't want indexing. */
  noindex?: boolean;

  /** Schema.org JSON-LD object — pass output of structured-data helpers. */
  jsonLd?: object | object[];

  /** OG type override (default: "website"; use "article" for blog posts). */
  ogType?: "website" | "article" | "product" | "profile";
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function SEOHead({
  title,
  description,
  path = "/",
  ogImage,
  noindex = false,
  jsonLd,
  ogType = "website",
}: Props) {
  const cfg = (siteConfig as any).seo ?? {};
  const company = siteConfig.company;

  // Resolve the final values, falling back to siteConfig defaults
  const finalTitle = title || cfg.defaultTitle || `${company.name} — ${company.tagline}`;
  const finalDescription = description || cfg.defaultDescription || company.description;
  const baseUrl = (cfg.siteUrl || "").replace(/\/$/, "");
  const canonicalUrl = baseUrl + path;
  const finalOgImage = ogImage || cfg.defaultOgImage || `${baseUrl}/og-default.png`;
  const twitterHandle = cfg.twitterHandle;
  const locale = cfg.locale || "en_US";

  useEffect(() => {
    document.title = finalTitle;
    upsertMeta("name", "description", finalDescription);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("property", "og:image", finalOgImage);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:site_name", company.name);
    upsertMeta("property", "og:locale", locale);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDescription);
    upsertMeta("name", "twitter:image", finalOgImage);
    if (twitterHandle) upsertMeta("name", "twitter:site", twitterHandle);
    if (baseUrl) upsertCanonical(canonicalUrl);
  }, [
    finalTitle,
    finalDescription,
    canonicalUrl,
    finalOgImage,
    noindex,
    ogType,
    baseUrl,
    company.name,
    locale,
    twitterHandle,
  ]);

  // Structured data server-renders into the HTML (client components SSR too).
  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <>
      {jsonLdArray.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export default SEOHead;
