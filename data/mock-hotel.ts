import { siteConfig } from "@/content/site-config";

// Branding surface for the standalone /admin/login screen. Pulls from the
// baked site-config so the login page matches the tenant's identity without a
// database round-trip.
export const mockHotelConfig = {
  businessName: siteConfig.company.name,
  theme: {
    primaryColor: siteConfig.brand.primary,
    accentColor: siteConfig.brand.accent,
    fontHeading: siteConfig.typography.display,
  },
  hero: {
    backgroundImage: siteConfig.scrollHero.imageUrl || "",
  },
};
