// ============================================================
// VARIATION MANIFEST — Serene Wellness Clinic  (seed 758b18c3)
// ------------------------------------------------------------
// style_id ........... S-spa-nocturne (dark cinematic spa)
// archetype .......... G (mixed-media hybrid scroll)
// g_render_mode ...... loop  (calm 8s hero loop — no scrub, no HeroScrollText gate)
// palette ............ warm near-black bg / soft sand-gold primary / sage accent
// motion ............. M2 gentle push  (intensity: low)
// hero_overlay ....... HO1 centered
// header_variant ..... transparent-ghost
// footer_variant ..... FT2 asymmetric editorial
// card_variant ....... CV4 liquid glass  (components/ServiceCard.tsx = ServiceCardV4)
// scene_variant ...... SC2
// loading_variant .... L2
// voice_family ....... V3 organic
// booking ............ B1 drawer (industry: spa — every Book CTA → useBookingTrigger().open())
// asset_mode ......... live-generate
// build_mode ......... fullsite (real inner routes, no admin)
// ============================================================
//
// site-config.ts — single source of truth for all copy + brand.
// Edit this file to re-theme or update copy without touching components.
// ============================================================

export const siteConfig = {
  company: {
    name: "Serene Wellness Clinic",
    tagline: "Restore · Renew · Realign",
    description:
      "A calm sanctuary in the heart of Lagos for massage therapy, physiotherapy, and considered wellness care — where every visit is unhurried and every treatment is your own.",
    email: "hello@serenewellness.ng",
    phone: "+234 815 000 4242",
    location: "12 Bourdillon Road, Ikoyi, Lagos, Nigeria",
  },

  brand: {
    primary: "#C9A876", // soft sand-gold
    accent: "#A9BBA0", // muted sage (used as a full-section light background)
    bg: "#17130F", // warm near-black
  },

  typography: {
    display: "Fraunces",
    body: "Nunito Sans",
    mono: "Space Mono",
  },

  seo: {
    siteUrl: "https://serenewellness.ng",
    locale: "en_NG",
    htmlLang: "en-NG",
    defaultTitle: "Serene Wellness Clinic — Restore · Renew · Realign",
    defaultDescription:
      "Massage therapy, physiotherapy, and wellness consultations in Ikoyi, Lagos. Book a calm, unhurried treatment at Serene Wellness Clinic.",
    defaultOgImage: "https://serenewellness.ng/og-default.png",
    twitterHandle: "@serenewellnessng",
    noindexPaths: ["/account", "/admin", "/auth", "/api", "/booking-confirmation"],
    googleSiteVerification: "",
    structuredData: {
      businessType: "DaySpa",
      address: {
        streetAddress: "12 Bourdillon Road, Ikoyi",
        addressLocality: "Lagos",
        addressRegion: "Lagos",
        postalCode: "101233",
        addressCountry: "NG",
      },
      hours: [
        { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "20:00" },
        { days: ["Saturday"], opens: "09:00", closes: "18:00" },
        { days: ["Sunday"], opens: "10:00", closes: "16:00" },
      ],
      priceRange: "$$$",
      geo: { latitude: 6.4478, longitude: 3.4348 },
      rating: { ratingValue: 4.9, reviewCount: 214 },
      starRating: null,
      amenities: ["Steam Room", "Herbal Tea Lounge", "Private Treatment Suites", "Ample Parking"],
      cuisine: [],
    },
  },

  socials: {
    instagram: "https://instagram.com/serenewellnessng",
    twitter: "https://twitter.com/serenewellnessng",
    facebook: "https://facebook.com/serenewellnessng",
    linkedin: "",
    youtube: "",
    tiktok: "",
    whatsapp: "https://wa.me/2348150004242",
  },

  hero: {
    h1: [
      { text: "Stillness,", accent: false },
      { text: "beautifully", accent: true },
      { text: "restored.", accent: false },
    ],
  },

  tagline: "Restore · Renew · Realign",

  servicesHeading: "Treatments & Care",

  services: [
    {
      name: "Deep Tissue Massage",
      slug: "deep-tissue-massage",
      description:
        "Slow, deliberate pressure that releases the deepest knots and lets held tension finally let go.",
      highlights: ["60 or 90 minutes", "Certified therapists", "Warm oil ritual"],
    },
    {
      name: "Therapeutic Physiotherapy",
      slug: "therapeutic-physiotherapy",
      description:
        "Evidence-led rehabilitation and movement therapy to restore strength, ease pain, and rebuild confidence.",
      highlights: ["Personalised programme", "Post-injury recovery", "Chartered physiotherapists"],
    },
    {
      name: "Wellness Consultation",
      slug: "wellness-consultation",
      description:
        "A quiet, one-to-one session to map your body, your habits, and a gentle path back to balance.",
      highlights: ["45-minute session", "Holistic assessment", "Lifestyle guidance"],
    },
    {
      name: "Prenatal Massage",
      slug: "prenatal-massage",
      description:
        "Nurturing, side-lying bodywork designed for every trimester — safe, soothing, and deeply restful.",
      highlights: ["Pregnancy-safe", "Supported positioning", "Specialist therapists"],
    },
    {
      name: "Sports Recovery",
      slug: "sports-recovery",
      description:
        "Targeted recovery work for active bodies — mobilise, flush, and return to movement sooner.",
      highlights: ["Myofascial release", "Range-of-motion work", "Tailored to your sport"],
    },
    {
      name: "Aromatherapy Ritual",
      slug: "aromatherapy-ritual",
      description:
        "A full-sensory unwinding with hand-blended botanical oils that quiet the mind as they ease the body.",
      highlights: ["Bespoke oil blend", "Full-body treatment", "Herbal tea to close"],
    },
  ] as Array<{ name: string; slug: string; description: string; highlights?: string[] }>,

  // Bookable sessions read by BookingDrawer (B1). "pricePerNight" is repurposed
  // as price-per-session in NGN; the drawer treats each as a reservable slot.
  rooms: [
    {
      slug: "deep-tissue-massage",
      name: "Deep Tissue Massage — 60 min",
      description: "Slow, deliberate pressure to release the deepest tension.",
      pricePerNight: 45000,
      currency: "NGN",
      maxGuests: 1,
      image: "",
    },
    {
      slug: "therapeutic-physiotherapy",
      name: "Therapeutic Physiotherapy — Session",
      description: "Evidence-led rehabilitation with a chartered physiotherapist.",
      pricePerNight: 55000,
      currency: "NGN",
      maxGuests: 1,
      image: "",
    },
    {
      slug: "wellness-consultation",
      name: "Wellness Consultation — 45 min",
      description: "A holistic one-to-one assessment and lifestyle plan.",
      pricePerNight: 35000,
      currency: "NGN",
      maxGuests: 1,
      image: "",
    },
    {
      slug: "prenatal-massage",
      name: "Prenatal Massage — 60 min",
      description: "Nurturing, pregnancy-safe bodywork for every trimester.",
      pricePerNight: 48000,
      currency: "NGN",
      maxGuests: 1,
      image: "",
    },
    {
      slug: "aromatherapy-ritual",
      name: "Aromatherapy Ritual — 90 min",
      description: "A full-sensory unwinding with bespoke botanical oils.",
      pricePerNight: 62000,
      currency: "NGN",
      maxGuests: 1,
      image: "",
    },
  ] as Array<{
    slug: string;
    name: string;
    description: string;
    pricePerNight: number;
    currency: string;
    maxGuests: number;
    squareMeters?: number;
    image?: string;
    images?: string[];
    amenities?: string[];
  }>,

  locations: [] as Array<{
    slug: string;
    name: string;
    address: { streetAddress: string; city: string; region?: string; postalCode?: string; country: string };
    phone?: string;
    email?: string;
    geo?: { latitude: number; longitude: number };
    hours?: Array<{ days: string[]; opens: string; closes: string }>;
    images?: string[];
    description?: string;
  }>,

  gallery: [] as Array<{ src: string; alt: string; caption?: string; width?: number; height?: number }>,

  whyUs: {
    heading: "Why Serene",
    items: [
      {
        title: "Unhurried by design",
        description:
          "We never double-book a therapist or rush a treatment. Your session begins when you arrive and ends when you are truly ready.",
      },
      {
        title: "Clinically trained hands",
        description:
          "Every therapist is certified and every physiotherapist chartered — care you can trust, delivered with warmth.",
      },
      {
        title: "A sanctuary, not a spa floor",
        description:
          "Private suites, soft light, and stillness. From the moment you step in, the noise of Lagos fades away.",
      },
      {
        title: "Care that continues",
        description:
          "You leave with a plan — gentle guidance and follow-up so the calm lasts far beyond the treatment room.",
      },
    ],
  },

  process: [
    { step: 1, title: "Arrive", description: "Settle into the herbal tea lounge. No queues, no rush." },
    { step: 2, title: "Assess", description: "A quiet conversation to understand your body and your goals." },
    { step: 3, title: "Restore", description: "Your treatment, tailored entirely to you, in a private suite." },
    { step: 4, title: "Continue", description: "Leave with a gentle plan to carry the calm home." },
  ],

  aboutHeading: "A quieter kind of care",
  aboutStory:
    "Serene Wellness Clinic began with a simple belief: that healing asks for stillness. Founded in Ikoyi by a small team of therapists and physiotherapists, we set out to build a place unlike the busy spa floors of the city — somewhere unhurried, private, and genuinely restorative. Today we care for hundreds of Lagosians each month, blending clinical rigour with the soft rituals of true rest.",
  manifesto: "Rest is not a reward for the exhausted. It is the foundation of a life lived well.",
  values: [
    { title: "Presence", description: "We are fully with you, for the whole of your visit." },
    { title: "Integrity", description: "Honest guidance, clinically grounded, never oversold." },
    { title: "Warmth", description: "Care that feels human, gentle, and unmistakably kind." },
    { title: "Stillness", description: "A calm that begins at the door and follows you home." },
  ],

  work: [
    {
      title: "Post-marathon recovery programme",
      client: "Lagos City Runners",
      service: "Sports Recovery",
      result: "Athletes returned to training an average of 40% sooner.",
    },
    {
      title: "Prenatal care across three trimesters",
      client: "Private client",
      service: "Prenatal Massage",
      result: "Reduced back pain and improved sleep through to delivery.",
    },
    {
      title: "Chronic lower-back rehabilitation",
      client: "Corporate wellness partner",
      service: "Therapeutic Physiotherapy",
      result: "Pain scores down 65% over an eight-week programme.",
    },
    {
      title: "Executive stress reset",
      client: "Financial services team",
      service: "Aromatherapy Ritual",
      result: "A standing monthly ritual for a team of twelve.",
    },
  ],

  stats: [
    { value: "12+", label: "Years of care" },
    { value: "4.9★", label: "From 214 reviews" },
    { value: "9", label: "Certified therapists" },
    { value: "6", label: "Private suites" },
  ],

  features: [
    {
      title: "Every treatment shaped around you.",
      description:
        "No two bodies are the same, so no two sessions are either. We assess, we listen, and we build each visit around what you actually need.",
    },
    { title: "Private treatment suites", description: "Six softly-lit rooms, never a shared floor." },
    { title: "Herbal tea lounge", description: "Arrive early and let the city fall away." },
    { title: "Clinical + holistic care", description: "Chartered physiotherapy meets restorative bodywork." },
  ],

  sectionThemeWord: "Breathe",

  narrative: [] as Array<{ speaker: string; text: string }>,

  mixedMedia: {
    skipSecondaryVideo: true,
    accentEyebrow: "The Feeling",
    accentLine: "You will not want to check the time.",
  },

  cta: {
    primary: "Book a Visit",
    secondary: "Explore Treatments",
  },

  ctaBlock: {
    heading: "Give yourself an hour.",
    description:
      "Your body has carried you through everything. Book a treatment and let us return the favour — quietly, completely.",
  },

  trustBar: ["Certified Therapists", "Chartered Physiotherapy", "Ikoyi, Lagos", "Open 7 Days"] as string[],

  scrollHero: {
    archetype: "G" as "A" | "B" | "C" | "D" | "E" | "F" | "G",
    styleId: "S-spa-nocturne",
    assetMode: "live-generate" as "live-generate" | "prompt-only",
    imageUrl: "",
    scrollDistance: 3,
  },

  headerVariant: "transparent-ghost" as const,
  footerVariant: "FT2" as const,
  bookingVariant: "B1" as const,
  industry: "spa" as const,

  motion: {
    scrollProgress: true,
    cursorFollower: false,
    intensity: "low" as "low" | "medium" | "high",
  },
} as const;

export type SiteConfig = typeof siteConfig;
