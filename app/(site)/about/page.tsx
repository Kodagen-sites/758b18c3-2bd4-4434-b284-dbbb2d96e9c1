import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { siteConfig } from "@/content/site-config";
import { assetImage } from "@/lib/resolve-asset";
import { FadeUp, StaggerChildren } from "@/components/motion";
import BookNowButton from "@/components/BookNowButton";
import { SEOHead } from "@/components/seo/SEOHead";
import { organizationSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "About",
  description: siteConfig.aboutStory.slice(0, 155),
};

const brand = { ...siteConfig.company, url: siteConfig.seo.siteUrl, socials: siteConfig.socials };

export default function AboutPage() {
  return (
    <>
      <SEOHead
        title={`${siteConfig.aboutHeading} — ${siteConfig.company.name}`}
        description={siteConfig.aboutStory.slice(0, 155)}
        path="/about"
        jsonLd={organizationSchema(brand, siteConfig.seo.structuredData.address)}
      />
      <PageHero
        eyebrow="Our Story"
        title={siteConfig.aboutHeading}
        image={assetImage("scene-1-start", "serene spa interior calm")}
        intro={siteConfig.company.description}
      />

      <section className="bg-bg px-5 py-24 md:px-10">
        <div className="mx-auto max-w-[1100px] grid gap-16 md:grid-cols-[1.4fr_1fr] md:items-start">
          <FadeUp>
            <p className="font-display text-2xl md:text-3xl font-light leading-relaxed text-cream/90">
              {siteConfig.aboutStory}
            </p>
            <p className="mt-8 font-serif italic text-xl text-primary">
              &ldquo;{siteConfig.manifesto}&rdquo;
            </p>
          </FadeUp>

          <StaggerChildren staggerDelay={0.1} className="grid grid-cols-2 gap-8">
            {siteConfig.stats.map((s, i) => (
              <div key={i}>
                <div className="font-display text-4xl md:text-5xl text-primary font-light">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-cream/60">{s.label}</div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <section className="px-5 py-24 md:px-10" style={{ background: siteConfig.brand.accent }}>
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div
              className="font-mono text-[11px] uppercase tracking-[0.3em] mb-10 opacity-70"
              style={{ color: siteConfig.brand.bg }}
            >
              What we stand for
            </div>
          </FadeUp>
          <StaggerChildren staggerDelay={0.08} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {siteConfig.values.map((v, i) => (
              <div key={i}>
                <h3 className="font-display text-2xl font-light mb-2" style={{ color: siteConfig.brand.bg }}>
                  {v.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: siteConfig.brand.bg, opacity: 0.75 }}>
                  {v.description}
                </p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <section className="bg-bg px-5 py-24 md:px-10 border-t border-cream/5">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <h2 className="font-display text-4xl md:text-5xl text-cream font-light mb-12">
              How a visit unfolds
            </h2>
          </FadeUp>
          <StaggerChildren staggerDelay={0.1} className="grid gap-8 md:grid-cols-4">
            {siteConfig.process.map((p) => (
              <div key={p.step} className="border-t border-cream/15 pt-5">
                <div className="font-mono text-xs text-primary/80 mb-3">0{p.step}</div>
                <h3 className="font-display text-xl text-cream mb-2">{p.title}</h3>
                <p className="text-sm text-cream/60 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </StaggerChildren>
          <FadeUp delay={0.2}>
            <div className="mt-16">
              <BookNowButton label={siteConfig.cta.primary} />
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
