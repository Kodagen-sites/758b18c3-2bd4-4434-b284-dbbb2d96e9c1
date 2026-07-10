// lib/seo/structured-data.ts
//
// Schema.org JSON-LD generators. Pass output to <SEOHead jsonLd={...} />.
//
// Each generator returns a JSON-LD object matching schema.org spec.
// Google reads these to produce rich snippets in search results
// (star ratings, business hours, price ranges, breadcrumbs, etc).
//
// References:
//   - LocalBusiness:    https://schema.org/LocalBusiness
//   - Hotel:            https://schema.org/Hotel
//   - Restaurant:       https://schema.org/Restaurant
//   - Service:          https://schema.org/Service
//   - Product:          https://schema.org/Product
//   - Organization:     https://schema.org/Organization
//   - BreadcrumbList:   https://schema.org/BreadcrumbList
//   - FAQPage:          https://schema.org/FAQPage
//   - Article:          https://schema.org/Article
//   - Event:            https://schema.org/Event
//
// Industry-aware: pick the appropriate generator based on engine + industry.
//   booking + hotel       → hotelSchema()
//   booking + restaurant  → restaurantSchema()
//   booking + (other)     → localBusinessSchema()
//   catalog + e-commerce  → productSchema() per product + organizationSchema()
//   crm                   → organizationSchema() + serviceSchema() per service
//   tickets               → eventSchema() per event + organizationSchema()

type BrandInfo = {
  name: string;
  tagline?: string;
  description: string;
  email: string;
  phone: string;
  location: string;
  logo?: string;
  url?: string;
  socials?: Record<string, string>;
};

type AddressInfo = {
  streetAddress?: string;
  addressLocality?: string;     // city
  addressRegion?: string;        // state / province
  postalCode?: string;
  addressCountry?: string;       // ISO 3166-1 alpha-2 (e.g. "NG")
};

// ─── Organization (the brand entity itself) ───────────────────────────
// Use on every page (typically in homepage + about). Tells Google:
// "this is the company, here are their socials, here's how to find them."

export function organizationSchema(brand: BrandInfo, address?: AddressInfo) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    description: brand.description,
    email: brand.email,
    telephone: brand.phone,
    url: brand.url,
  };
  
  if (brand.logo) schema.logo = brand.logo;
  if (brand.tagline) schema.slogan = brand.tagline;
  
  if (address) {
    schema.address = {
      "@type": "PostalAddress",
      ...address,
    };
  }
  
  // Social profiles → sameAs array (helps Google's Knowledge Graph link)
  if (brand.socials) {
    const sameAs = Object.values(brand.socials).filter(Boolean);
    if (sameAs.length > 0) schema.sameAs = sameAs;
  }
  
  return schema;
}

// ─── LocalBusiness (with address + hours + price range) ───────────────
// Use for any business with a physical location. Powers Google's local
// pack (the map + listings card). Hours and price range are optional but
// significantly boost rich-snippet eligibility.

type Hours = {
  dayOfWeek: ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday")[];
  opens: string;     // "09:00"
  closes: string;    // "17:00"
};

export function localBusinessSchema(opts: {
  brand: BrandInfo;
  address: AddressInfo;
  hours?: Hours[];
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  businessType?: string;            // e.g. "DentalClinic", "BeautySalon", "AutoRepair", "AutoDealer"
  rating?: { value: number; count: number };
  geo?: { latitude: number; longitude: number };
}) {
  const { brand, address, hours, priceRange, businessType = "LocalBusiness", rating, geo } = opts;
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": businessType,
    name: brand.name,
    description: brand.description,
    email: brand.email,
    telephone: brand.phone,
    url: brand.url,
    address: { "@type": "PostalAddress", ...address },
  };
  
  if (brand.logo) schema.image = brand.logo;
  if (priceRange) schema.priceRange = priceRange;
  
  if (hours && hours.length > 0) {
    schema.openingHoursSpecification = hours.map(h => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.dayOfWeek,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  
  if (rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.value,
      reviewCount: rating.count,
    };
  }
  
  if (geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }
  
  return schema;
}

// ─── Hotel (booking engine specific) ───────────────────────────────────
// More specific than LocalBusiness — surfaces star rating, room types,
// amenities in search results.

export function hotelSchema(opts: {
  brand: BrandInfo;
  address: AddressInfo;
  starRating?: number;             // 3, 4, 5
  amenities?: string[];            // ["Wi-Fi", "Pool", "Spa", "Restaurant"]
  numberOfRooms?: number;
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  rating?: { value: number; count: number };
}) {
  const base = localBusinessSchema({ ...opts, businessType: "Hotel" });
  
  if (opts.starRating) {
    base.starRating = {
      "@type": "Rating",
      ratingValue: opts.starRating,
    };
  }
  
  if (opts.amenities && opts.amenities.length > 0) {
    base.amenityFeature = opts.amenities.map(a => ({
      "@type": "LocationFeatureSpecification",
      name: a,
      value: true,
    }));
  }
  
  if (opts.numberOfRooms) {
    base.numberOfRooms = opts.numberOfRooms;
  }
  
  return base;
}

// ─── Restaurant (booking + catalog hybrid) ─────────────────────────────

export function restaurantSchema(opts: {
  brand: BrandInfo;
  address: AddressInfo;
  servesCuisine?: string[];        // ["Nigerian", "Continental"]
  acceptsReservations?: boolean;
  hasMenu?: string;                // URL to menu page
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  hours?: Hours[];
  rating?: { value: number; count: number };
}) {
  const base = localBusinessSchema({ ...opts, businessType: "Restaurant" });
  
  if (opts.servesCuisine && opts.servesCuisine.length > 0) {
    base.servesCuisine = opts.servesCuisine;
  }
  
  if (typeof opts.acceptsReservations === "boolean") {
    base.acceptsReservations = opts.acceptsReservations ? "Yes" : "No";
  }
  
  if (opts.hasMenu) {
    base.hasMenu = opts.hasMenu;
  }
  
  return base;
}

// ─── Service (CRM engine — for service pages) ──────────────────────────

export function serviceSchema(opts: {
  service: { name: string; description: string; slug?: string };
  provider: BrandInfo;
  serviceType?: string;            // "Legal", "Consulting", "Accounting"
  areaServed?: string;             // "Lagos, Nigeria" or country code
  priceRange?: string;
  serviceUrl?: string;
}) {
  const { service, provider, serviceType, areaServed, priceRange, serviceUrl } = opts;
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    provider: {
      "@type": "Organization",
      name: provider.name,
      url: provider.url,
    },
  };
  
  if (serviceType) schema.serviceType = serviceType;
  if (areaServed) schema.areaServed = areaServed;
  if (priceRange) schema.offers = { "@type": "Offer", priceSpecification: priceRange };
  if (serviceUrl) schema.url = serviceUrl;
  
  return schema;
}

// ─── Product (catalog engine — per product) ────────────────────────────

export function productSchema(opts: {
  product: {
    name: string;
    description: string;
    slug: string;
    sku?: string;
    image?: string;
    price?: number;        // in major currency unit (e.g. 99.99)
    currency?: string;     // "NGN", "USD", "EUR"
    availability?: "InStock" | "OutOfStock" | "PreOrder";
    rating?: { value: number; count: number };
  };
  brand: BrandInfo;
  productUrl: string;
}) {
  const { product, brand, productUrl } = opts;
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url: productUrl,
    brand: { "@type": "Brand", name: brand.name },
  };
  
  if (product.sku) schema.sku = product.sku;
  if (product.image) schema.image = product.image;
  
  if (product.price !== undefined) {
    schema.offers = {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: `https://schema.org/${product.availability || "InStock"}`,
      url: productUrl,
    };
  }
  
  if (product.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.value,
      reviewCount: product.rating.count,
    };
  }
  
  return schema;
}

// ─── Event (tickets engine — per event) ────────────────────────────────

export function eventSchema(opts: {
  event: {
    name: string;
    description: string;
    startDate: string;       // ISO 8601 with timezone
    endDate?: string;
    location: { name: string; address?: AddressInfo };
    image?: string;
    eventStatus?: "EventScheduled" | "EventCancelled" | "EventPostponed";
    eventAttendanceMode?: "OfflineEventAttendanceMode" | "OnlineEventAttendanceMode" | "MixedEventAttendanceMode";
    offers?: Array<{ name: string; price: number; currency: string; url: string; availability?: string }>;
  };
  organizer: BrandInfo;
  eventUrl: string;
}) {
  const { event, organizer, eventUrl } = opts;
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    url: eventUrl,
    organizer: { "@type": "Organization", name: organizer.name, url: organizer.url },
    eventStatus: `https://schema.org/${event.eventStatus || "EventScheduled"}`,
    eventAttendanceMode: `https://schema.org/${event.eventAttendanceMode || "OfflineEventAttendanceMode"}`,
    location: {
      "@type": event.location.address ? "Place" : "VirtualLocation",
      name: event.location.name,
      ...(event.location.address ? { address: { "@type": "PostalAddress", ...event.location.address } } : { url: eventUrl }),
    },
  };
  
  if (event.endDate) schema.endDate = event.endDate;
  if (event.image) schema.image = event.image;
  
  if (event.offers && event.offers.length > 0) {
    schema.offers = event.offers.map(o => ({
      "@type": "Offer",
      name: o.name,
      price: o.price,
      priceCurrency: o.currency,
      url: o.url,
      availability: `https://schema.org/${o.availability || "InStock"}`,
    }));
  }
  
  return schema;
}

// ─── BreadcrumbList (any deep page) ────────────────────────────────────
// Use on any page deeper than 1 level. Turns plain URLs in search results
// into clickable breadcrumb trail (Brand > Services > Web Design).

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── FAQPage (FAQ section on any page) ─────────────────────────────────
// Use when a page has a Q&A section. Eligible for FAQ rich snippets in
// Google search (the expandable accordion under your result).

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ─── Article (blog post / news) ────────────────────────────────────────

export function articleSchema(opts: {
  article: {
    headline: string;
    description: string;
    datePublished: string;
    dateModified?: string;
    image?: string;
    authorName: string;
    url: string;
  };
  publisher: BrandInfo;
}) {
  const { article, publisher } = opts;
  
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    image: article.image,
    author: { "@type": "Person", name: article.authorName },
    publisher: {
      "@type": "Organization",
      name: publisher.name,
      logo: publisher.logo ? { "@type": "ImageObject", url: publisher.logo } : undefined,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": article.url },
  };
}

// ─── WebSite (sitewide search box) ─────────────────────────────────────
// Use ONLY on homepage. If site has a /search page, this enables Google
// to render a sitelink search box under the result.

export function websiteSchema(opts: {
  brand: BrandInfo;
  hasSearchPage?: boolean;
  searchUrlPattern?: string;       // e.g. "/search?q={query}"
}) {
  const { brand, hasSearchPage, searchUrlPattern } = opts;
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: brand.url,
  };
  
  if (hasSearchPage && searchUrlPattern && brand.url) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: brand.url + searchUrlPattern.replace("{query}", "{search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    };
  }
  
  return schema;
}
