import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { siteConfig } from "@/content/site-config";
import { assetImage } from "@/lib/resolve-asset";
import { FadeUp, StaggerChildren } from "@/components/motion";
import BookNowButton from "@/components/BookNowButton";
import { SEOHead } from "@/components/seo/SEOHead";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Real recovery, real results. A look at the outcomes we've helped clients across Lagos achieve at Serene Wellness Clinic.",
};

export default function WorkPage() {
  return (
    <>
      <SEOHead
        title={`Our Work — ${siteConfig.company.name}`}
        description="Outcomes and recovery stories from Serene Wellness Clinic."
        path="/work"
      />
      <PageHero
        eyebrow="Outcomes"
        title="Care that shows"
        image={assetImage("service-therapeutic-physiotherapy", "physiotherapy recovery")}
        intro="Wellness is measured in how you feel and how you move. Here are a few of the journeys we've shared."
      />

      <section className="bg-bg px-5 py-24 md:px-10">
        <div className="mx-auto max-w-[1100px]">
          <StaggerChildren staggerDelay={0.1} className="grid gap-6 md:grid-cols-2">
            {siteConfig.work.map((w, i) => (
              <div
                key={i}
                className="rounded-3xl border border-cream/10 bg-cream/[0.02] p-8 hover:border-primary/30 transition-all"
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80 mb-4">
                  {w.service}
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-cream font-light mb-3">
                  {w.title}
                </h3>
                <p className="text-cream/60 text-sm mb-6">{w.client}</p>
                <p className="font-serif italic text-lg text-primary leading-relaxed">{w.result}</p>
              </div>
            ))}
          </StaggerChildren>

          <FadeUp delay={0.2}>
            <div className="mt-20 text-center">
              <h2 className="font-display text-3xl md:text-5xl text-cream font-light mb-6">
                Your story starts with an hour.
              </h2>
              <BookNowButton label={siteConfig.cta.primary} />
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
