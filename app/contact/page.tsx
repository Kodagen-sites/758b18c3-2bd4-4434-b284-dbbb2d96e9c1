import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import PageHero from "@/components/PageHero";
import { siteConfig } from "@/content/site-config";
import { getSiteContent } from "@/lib/site-content";
import { assetImage } from "@/lib/resolve-asset";
import { FadeUp } from "@/components/motion";
import BookNowButton from "@/components/BookNowButton";
import { SEOHead } from "@/components/seo/SEOHead";
import { localBusinessSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Visit Us",
  description:
    "Find Serene Wellness Clinic in Ikoyi, Lagos. Book a treatment, call, or email — we'd love to welcome you.",
};

const brand = { ...siteConfig.company, url: siteConfig.seo.siteUrl, socials: siteConfig.socials };

export default async function ContactPage() {
  const sd = siteConfig.seo.structuredData;
  const cms = await getSiteContent();
  const email = cms?.contact?.email || siteConfig.company.email;
  const phone = cms?.contact?.phone || siteConfig.company.phone;
  const location = cms?.contact?.address || siteConfig.company.location;
  return (
    <>
      <SEOHead
        title={`Visit Us — ${siteConfig.company.name}`}
        description="Find and book Serene Wellness Clinic in Ikoyi, Lagos."
        path="/contact"
        jsonLd={localBusinessSchema({
          brand,
          address: sd.address,
          businessType: sd.businessType,
          hours: sd.hours.map((h) => ({ dayOfWeek: [...h.days], opens: h.opens, closes: h.closes })),
          priceRange: sd.priceRange,
          geo: sd.geo,
        })}
      />
      <PageHero
        eyebrow="Visit Us"
        title="Come and be still"
        image={assetImage("scene-1-start", "spa reception calm")}
        intro="Our doors are open seven days a week in the heart of Ikoyi. Book ahead, or simply reach out."
      />

      <section className="bg-bg px-5 py-24 md:px-10">
        <div className="mx-auto grid max-w-[1100px] gap-16 md:grid-cols-2 md:items-start">
          <FadeUp>
            <div className="space-y-8">
              <ContactRow icon={<MapPin size={18} />} label="Find us" value={location} />
              <ContactRow
                icon={<Phone size={18} />}
                label="Call us"
                value={phone}
                href={`tel:${phone.replace(/\s+/g, "")}`}
              />
              <ContactRow
                icon={<Mail size={18} />}
                label="Email us"
                value={email}
                href={`mailto:${email}`}
              />
              <div className="flex items-start gap-4">
                <div className="mt-1 text-primary">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream/50 mb-2">
                    Opening hours
                  </div>
                  <ul className="space-y-1 text-cream/80">
                    <li>Mon – Fri &nbsp; 08:00 – 20:00</li>
                    <li>Saturday &nbsp; 09:00 – 18:00</li>
                    <li>Sunday &nbsp; 10:00 – 16:00</li>
                  </ul>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="rounded-3xl border border-cream/10 bg-cream/[0.03] p-8 md:p-10">
              <h2 className="font-display text-3xl text-cream font-light mb-3">
                Reserve your treatment
              </h2>
              <p className="text-cream/70 mb-8">
                Choose a treatment and a time that suits you — it takes less than a minute, and your
                therapist will be ready when you arrive.
              </p>
              <BookNowButton label={siteConfig.cta.primary} />
              <p className="mt-6 text-sm text-cream/50">
                Prefer to talk first? Message us on{" "}
                <a href={siteConfig.socials.whatsapp} className="text-primary hover:underline">
                  WhatsApp
                </a>
                .
              </p>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 text-primary">{icon}</div>
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream/50 mb-1">
          {label}
        </div>
        {href ? (
          <a href={href} className="text-lg text-cream hover:text-primary transition-colors">
            {value}
          </a>
        ) : (
          <div className="text-lg text-cream">{value}</div>
        )}
      </div>
    </div>
  );
}
