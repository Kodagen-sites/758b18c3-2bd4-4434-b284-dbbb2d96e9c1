import type { Metadata } from "next";
import { Fraunces, Nunito_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/content/site-config";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.seo.siteUrl),
  title: {
    default: siteConfig.seo.defaultTitle,
    template: `%s — ${siteConfig.company.name}`,
  },
  description: siteConfig.seo.defaultDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.company.name,
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    url: siteConfig.seo.siteUrl,
    locale: siteConfig.seo.locale,
    images: [{ url: siteConfig.seo.defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.seo.twitterHandle,
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
    images: [siteConfig.seo.defaultOgImage],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={siteConfig.seo.htmlLang}
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="bg-bg text-cream font-body antialiased">
        {children}
      </body>
    </html>
  );
}
