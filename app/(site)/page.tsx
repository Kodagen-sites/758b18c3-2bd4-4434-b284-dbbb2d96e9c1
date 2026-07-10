import Link from "next/link";
import { siteConfig } from "@/content/site-config";
import { getSiteContent } from "@/lib/site-content";
import { assetImage, heroVideo } from "@/lib/resolve-asset";
import {
  FadeUp,
  StaggerChildren,
  TextReveal,
  ImageRevealMask,
} from "@/components/motion";
import BookNowButton from "@/components/BookNowButton";
import { SEOHead } from "@/components/seo/SEOHead";
import { localBusinessSchema, websiteSchema } from "@/lib/seo/structured-data";

const brand = { ...siteConfig.company, url: siteConfig.seo.siteUrl, socials: siteConfig.socials };

export default async function HomePage() {
  const sd = siteConfig.seo.structuredData;
  const cms = await getSiteContent();
  const cmsHeadline = cms?.hero?.headline || "";
  return (
    <div className="relative">
      <SEOHead
        path="/"
        jsonLd={[
          websiteSchema({ brand }),
          localBusinessSchema({
            brand,
            address: sd.address,
            businessType: sd.businessType,
            hours: sd.hours.map((h) => ({ dayOfWeek: [...h.days], opens: h.opens, closes: h.closes })),
            priceRange: sd.priceRange,
            geo: sd.geo,
            rating: { value: sd.rating.ratingValue, count: sd.rating.reviewCount },
          }),
        ]}
      />
      <VideoHeroSection cmsHeadline={cmsHeadline} cmsTagline={cms?.tagline || ""} />
      <ImageMockupSection />
      <OversizedTypeSection />
      <ImageGridSection />
      <CtaSection />
    </div>
  );
}

// ── Section 1 — VIDEO HERO (loop) ────────────────────────────────────
function VideoHeroSection({ cmsHeadline = "", cmsTagline = "" }: { cmsHeadline?: string; cmsTagline?: string }) {
  const video = heroVideo();
  const poster = assetImage("scene-1-start", "serene spa treatment room soft light");
  return (
    <section className="relative min-h-screen bg-bg flex items-center justify-center px-6 overflow-hidden">
      {video ? (
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          src={video}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          src={poster}
          alt=""
          loading="eager"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/20 to-bg pointer-events-none" />

      <div className="relative max-w-4xl text-center">
        <div className="font-mono text-[11px] tracking-[0.4em] text-primary/90 uppercase mb-6">
          {cmsTagline || siteConfig.company.tagline}
        </div>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-light leading-[0.98] text-cream">
          {cmsHeadline ? (
            <span className="block">{cmsHeadline}</span>
          ) : (
            siteConfig.hero.h1.map((line, i) => (
              <span
                key={i}
                className={`block ${line.accent ? "italic font-serif text-primary" : ""}`}
              >
                {line.text}
              </span>
            ))
          )}
        </h1>
        <p className="mt-8 text-base md:text-lg text-cream/75 max-w-xl mx-auto">
          {siteConfig.company.description}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <BookNowButton label={siteConfig.cta.primary} />
          <Link
            href="/services"
            className="min-h-[48px] px-8 py-3.5 rounded-full border border-cream/20 bg-cream/5 text-cream font-display font-medium text-sm backdrop-blur-md hover:bg-cream/10 inline-flex items-center justify-center"
          >
            {siteConfig.cta.secondary}
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.4em] text-cream/60 uppercase animate-pulse">
        Scroll ↓
      </div>
    </section>
  );
}

// ── Section 2 — IMAGE + COPY ─────────────────────────────────────────
function ImageMockupSection() {
  const feature = siteConfig.features[0];
  const rest = siteConfig.features.slice(1, 4);
  return (
    <section className="relative min-h-screen bg-bg flex items-center px-6 py-24 border-t border-cream/5 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
        <div>
          <FadeUp>
            <div className="font-mono text-[11px] tracking-[0.3em] text-primary/80 uppercase mb-4">
              The Serene Difference
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="font-display text-4xl md:text-6xl text-cream font-light leading-[1.05] mb-6">
              {feature.title}
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-lg text-cream/70 leading-relaxed mb-8">
              {feature.description}
            </p>
          </FadeUp>
          <StaggerChildren staggerDelay={0.08} initialDelay={0.3} className="space-y-3">
            {rest.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <div className="font-display font-semibold text-cream text-sm">{f.title}</div>
                  <div className="text-cream/60 text-sm mt-0.5">{f.description}</div>
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
        <div className="relative">
          <ImageRevealMask
            src={assetImage("section-mockup", "massage therapy hands warm oil")}
            alt="A therapist at work"
            aspectClass="aspect-[4/3]"
            className="rounded-2xl border border-cream/10 bg-gradient-to-br from-primary/20 via-cream/5 to-accent/20"
          />
        </div>
      </div>
    </section>
  );
}

// ── Section 3 — OVERSIZED TYPE (manifesto) ───────────────────────────
function OversizedTypeSection() {
  return (
    <section
      className="relative min-h-[80vh] flex items-center overflow-hidden px-6 md:px-12"
      style={{ background: siteConfig.brand.accent }}
    >
      <div className="max-w-7xl mx-auto w-full">
        <FadeUp>
          <div
            className="font-mono text-xs tracking-[0.4em] uppercase mb-6 opacity-70"
            style={{ color: siteConfig.brand.bg }}
          >
            {siteConfig.whyUs.heading}
          </div>
        </FadeUp>
        <TextReveal
          as="h2"
          className="font-display font-light text-[72px] sm:text-[130px] md:text-[200px] lg:text-[300px] leading-[0.88] tracking-tight break-words"
          stagger={0.08}
        >
          {siteConfig.sectionThemeWord}
        </TextReveal>
        <FadeUp delay={0.4}>
          <p className="mt-10 max-w-xl text-base md:text-lg opacity-80" style={{ color: siteConfig.brand.bg }}>
            {siteConfig.manifesto}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Section 4 — SERVICES GRID ────────────────────────────────────────
function ImageGridSection() {
  return (
    <section className="relative bg-bg flex items-center px-6 py-28 border-t border-cream/5">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-12">
          <FadeUp>
            <div className="font-mono text-[11px] tracking-[0.3em] text-primary/80 uppercase mb-3">
              Treatments & Care
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="font-display text-4xl md:text-6xl text-cream font-light">
              {siteConfig.servicesHeading}
            </h2>
          </FadeUp>
        </div>
        <StaggerChildren
          staggerDelay={0.08}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {siteConfig.services.map((svc) => (
            <Link
              key={svc.slug}
              href={`/services/${svc.slug}`}
              className="group block rounded-2xl border border-cream/10 overflow-hidden bg-cream/[0.02] hover:border-primary/40 transition-all h-full"
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-primary/25 via-cream/5 to-accent/25">
                <img
                  src={assetImage(`service-${svc.slug}`, svc.name)}
                  alt={svc.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg text-cream mb-2">{svc.name}</h3>
                <p className="text-cream/60 text-sm leading-snug line-clamp-2">{svc.description}</p>
                <div className="mt-3 font-mono text-xs text-primary/80 group-hover:text-primary transition-colors">
                  Learn more →
                </div>
              </div>
            </Link>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

// ── Section 5 — CTA ──────────────────────────────────────────────────
function CtaSection() {
  return (
    <section className="relative bg-bg py-32 px-6 border-t border-cream/5">
      <div className="max-w-3xl mx-auto text-center">
        <FadeUp>
          <h2 className="font-display text-5xl md:text-7xl text-cream font-light leading-[1.0] mb-6">
            {siteConfig.ctaBlock.heading}
          </h2>
        </FadeUp>
        <FadeUp delay={0.15}>
          <p className="text-lg text-cream/70 mb-10 max-w-xl mx-auto">
            {siteConfig.ctaBlock.description}
          </p>
        </FadeUp>
        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <BookNowButton label={siteConfig.cta.primary} />
            <a
              href={`mailto:${siteConfig.company.email}`}
              className="min-h-[48px] px-8 py-4 rounded-full border border-cream/20 text-cream font-display font-medium hover:bg-cream/5 inline-flex items-center justify-center"
            >
              Or email us directly
            </a>
          </div>
        </FadeUp>
        <FadeUp delay={0.45}>
          <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] md:text-[11px] text-cream/50 font-mono uppercase tracking-wider">
            {siteConfig.trustBar.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
