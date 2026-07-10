import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { siteConfig } from "@/content/site-config";
import { assetImage } from "@/lib/resolve-asset";
import { FadeUp, StaggerChildren } from "@/components/motion";
import ServiceCardV4 from "@/components/ServiceCard";
import BookNowButton from "@/components/BookNowButton";
import { SEOHead } from "@/components/seo/SEOHead";

export const metadata: Metadata = {
  title: "Treatments & Care",
  description:
    "Massage therapy, physiotherapy, and wellness consultations — unhurried treatments tailored entirely to you at Serene Wellness Clinic, Ikoyi.",
};

export default function ServicesPage() {
  return (
    <>
      <SEOHead
        title={`Treatments & Care — ${siteConfig.company.name}`}
        description="Massage therapy, physiotherapy, and wellness consultations in Ikoyi, Lagos."
        path="/services"
      />
      <PageHero
        eyebrow="Treatments & Care"
        title="Care, shaped around you"
        image={assetImage("section-mockup", "massage therapy calm")}
        intro="Every treatment begins with listening. Explore the ways we help Lagos rest, recover, and realign."
      />

      <section className="bg-bg px-5 py-24 md:px-10">
        <div className="mx-auto max-w-[1200px]">
          <StaggerChildren
            staggerDelay={0.08}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {siteConfig.services.map((svc) => (
              <ServiceCardV4
                key={svc.slug}
                service={svc}
                imageSrc={assetImage(`service-${svc.slug}`, svc.name)}
              />
            ))}
          </StaggerChildren>

          <FadeUp delay={0.2}>
            <div className="mt-20 rounded-3xl border border-cream/10 bg-cream/[0.02] px-8 py-14 text-center">
              <h2 className="font-display text-3xl md:text-5xl text-cream font-light mb-4">
                {siteConfig.ctaBlock.heading}
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-cream/70">{siteConfig.ctaBlock.description}</p>
              <BookNowButton label={siteConfig.cta.primary} />
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
