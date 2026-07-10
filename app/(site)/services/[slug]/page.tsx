import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { siteConfig } from "@/content/site-config";
import { assetImage } from "@/lib/resolve-asset";
import { FadeUp, StaggerChildren } from "@/components/motion";
import BookNowButton from "@/components/BookNowButton";
import { SEOHead } from "@/components/seo/SEOHead";
import { serviceSchema, breadcrumbSchema } from "@/lib/seo/structured-data";

const brand = { ...siteConfig.company, url: siteConfig.seo.siteUrl };

export function generateStaticParams() {
  return siteConfig.services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const svc = siteConfig.services.find((s) => s.slug === slug);
  if (!svc) return { title: "Treatment" };
  return { title: svc.name, description: svc.description };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const svc = siteConfig.services.find((s) => s.slug === slug);
  if (!svc) notFound();

  const others = siteConfig.services.filter((s) => s.slug !== slug).slice(0, 3);

  return (
    <>
      <SEOHead
        title={`${svc.name} — ${siteConfig.company.name}`}
        description={svc.description}
        path={`/services/${svc.slug}`}
        jsonLd={[
          serviceSchema({
            service: svc,
            provider: brand,
            areaServed: "Lagos, Nigeria",
            serviceUrl: `${siteConfig.seo.siteUrl}/services/${svc.slug}`,
          }),
          breadcrumbSchema([
            { name: "Home", url: siteConfig.seo.siteUrl },
            { name: "Treatments", url: `${siteConfig.seo.siteUrl}/services` },
            { name: svc.name, url: `${siteConfig.seo.siteUrl}/services/${svc.slug}` },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Treatment"
        title={svc.name}
        image={assetImage(`service-${svc.slug}`, svc.name)}
        intro={svc.description}
      />

      <section className="bg-bg px-5 py-24 md:px-10">
        <div className="mx-auto grid max-w-[1100px] gap-16 md:grid-cols-[1.3fr_1fr] md:items-start">
          <div>
            <FadeUp>
              <h2 className="font-display text-3xl md:text-4xl text-cream font-light mb-6">
                What to expect
              </h2>
              <p className="text-lg text-cream/70 leading-relaxed">{svc.description}</p>
              <p className="mt-4 text-cream/70 leading-relaxed">
                Your session is unhurried and entirely your own. We begin with a short conversation to
                understand how you&rsquo;re feeling, then tailor the treatment to your body on the day — in a
                private, softly-lit suite.
              </p>
            </FadeUp>

            {svc.highlights && svc.highlights.length > 0 && (
              <StaggerChildren staggerDelay={0.08} className="mt-10 grid gap-4 sm:grid-cols-3">
                {svc.highlights.map((h, i) => (
                  <div key={i} className="rounded-2xl border border-cream/10 bg-cream/[0.02] p-5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mb-3" />
                    <div className="font-display text-cream text-sm">{h}</div>
                  </div>
                ))}
              </StaggerChildren>
            )}
          </div>

          <FadeUp delay={0.15}>
            <div className="rounded-3xl border border-cream/10 bg-cream/[0.03] p-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80 mb-4">
                Ready when you are
              </div>
              <p className="text-cream/70 mb-6">
                Reserve a {svc.name.toLowerCase()} session at a time that suits you.
              </p>
              <BookNowButton label={siteConfig.cta.primary} slug={svc.slug} />
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="bg-bg px-5 pb-28 md:px-10 border-t border-cream/5 pt-20">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="font-display text-2xl md:text-3xl text-cream font-light mb-8">
            Other treatments
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/services/${o.slug}`}
                className="group rounded-2xl border border-cream/10 bg-cream/[0.02] p-6 hover:border-primary/40 transition-all"
              >
                <h3 className="font-display text-lg text-cream mb-2">{o.name}</h3>
                <p className="text-sm text-cream/60 line-clamp-2">{o.description}</p>
                <div className="mt-3 font-mono text-xs text-primary/80 group-hover:text-primary">
                  View →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
