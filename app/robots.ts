import type { MetadataRoute } from "next";
import { siteConfig } from "@/content/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...siteConfig.seo.noindexPaths],
    },
    sitemap: `${siteConfig.seo.siteUrl}/sitemap.xml`,
    host: siteConfig.seo.siteUrl,
  };
}
