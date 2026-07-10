export interface SiteConfig {
  templateId: "hospitality-v1" | "realestate-v1" | "realestate-v2" | "auto-v1" | "auto-v2" | "professional-v1" | "restaurant-v1" | "restaurant-v2" | "fitness-v1" | "fitness-v2" | "beauty-v1" | "beauty-v2" | "construction-v1" | "construction-v2" | "law-v1" | "law-v2" | "education-v1" | "education-v2" | "medical-v1" | "medical-v2" | "security-v1" | "security-v2" | "security-v3" | "security-v4" | "universal-security-premium-v1" | "oilgas-v1" | "oilgas-v2" | "consulting-v1" | "consulting-v2" | "travel-v1" | "travel-v2" | "cleaning-v1" | "cleaning-v2" | "fashion-v1" | "fashion-v2" | "tech-v1" | "tech-v2" | "vodi-v1" | "universal-editorial-hotel-v1" | "aviation-v1" | "universal-editorial-v1" | "universal-editorial-consultancy-v1";
  businessName: string;
  tagline: string;

  /** Site slug — used by client forms (booking, contact) to POST to the right tenant */
  slug?: string;

  /** Industry sub-type for professional template */
  industryType?: "dental" | "law" | "security" | "oilgas" | "consulting" | "construction" | "medical" | "logistics";

  /** Engine actually shipped with the admin ("booking" | "catalog" | "crm" | "tickets").
   *  Drives which operations module the admin sidebar shows. */
  engine?: string;

  /** Explicit admin sidebar module override — set when the engine/templateId
   *  heuristics would guess wrong for this business. */
  adminModule?: "bookings" | "rentals" | "appointments" | "catalog" | "crm" | "tickets";

  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontHeading: string;
    fontBody: string;
    style: "modern" | "classic" | "bold" | "elegant";
  };

  logo: {
    path: string;
    alt: string;
  } | null;

  /** Favicon URL — emitted as `<link rel="icon">` in the root layout */
  favicon?: string;

  hero: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaLink: string;
    backgroundImage: string;
    overlayOpacity: number;
  };

  about: {
    title: string;
    paragraphs: string[];
    mission: string;
    vision: string;
    image?: string;
  };

  services: {
    title: string;
    subtitle?: string;
    items: ServiceItem[];
  };

  /** Team members / professionals / agents */
  team?: {
    title: string;
    subtitle?: string;
    members: TeamMemberProfile[];
  };

  /** Stats / achievements to display */
  stats?: StatItem[];

  /** Portfolio / case studies / projects */
  portfolio?: {
    title: string;
    subtitle?: string;
    items: PortfolioItem[];
  };

  /** Client logos / trust badges */
  clients?: {
    title: string;
    logos: { src: string; alt: string }[];
  };

  gallery: {
    title: string;
    subtitle?: string;
    images: GalleryImage[];
  };

  testimonials: Testimonial[];

  contact: {
    title: string;
    subtitle?: string;
    address: string;
    phone: string;
    email: string;
    googleMapsEmbed?: string;
    formEnabled: boolean;
    /** Working hours */
    hours?: string;
  };

  socialLinks: SocialLink[];

  footer: {
    copyrightText: string;
    additionalLinks?: { label: string; url: string }[];
  };

  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage?: string;
  };
}

export interface ServiceItem {
  name: string;
  description: string;
  price?: string;
  icon: string;
  image?: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar?: string;
}

export interface SocialLink {
  platform: "instagram" | "facebook" | "twitter" | "tiktok" | "whatsapp" | "messenger";
  url: string;
}

export interface TeamMemberProfile {
  name: string;
  role: string;
  bio?: string;
  image?: string;
  qualifications?: string[];
}

export interface StatItem {
  value: string;
  label: string;
}

export interface PortfolioItem {
  title: string;
  category: string;
  description: string;
  image?: string;
  client?: string;
}
