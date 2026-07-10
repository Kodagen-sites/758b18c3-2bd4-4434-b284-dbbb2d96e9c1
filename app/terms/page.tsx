import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { siteConfig } from "@/content/site-config";
import { assetImage } from "@/lib/resolve-asset";

const company = siteConfig.company.name;
const email = siteConfig.company.email;
const jurisdiction = siteConfig.company.location;
const effectiveDate = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${company}'s services and website.`,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-cream font-light mb-3">{title}</h2>
      <div className="space-y-3 text-cream/70 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        image={assetImage("scene-1-start", "calm spa interior")}
        intro={`The terms that govern your visits to and use of ${company}.`}
      />
      <div className="bg-bg px-5 py-20 md:px-10">
        <div className="mx-auto max-w-[760px]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/80 mb-10">
            Effective {effectiveDate}
          </p>

          <Section title="Agreement">
            <p>
              By booking a treatment or using the {company} website, you agree to these terms. If you do not
              agree, please refrain from booking. We operate in {jurisdiction}.
            </p>
          </Section>

          <Section title="Bookings & appointments">
            <p>
              Appointments are subject to availability. We ask that you arrive a few minutes early so your
              session can begin on time. Prices shown are indicative and may vary based on treatment length
              and specific needs discussed during your consultation.
            </p>
          </Section>

          <Section title="Cancellations">
            <p>
              We kindly request at least 24 hours&rsquo; notice to cancel or reschedule an appointment. Late
              cancellations or missed appointments may incur a fee.
            </p>
          </Section>

          <Section title="Health & suitability">
            <p>
              Our treatments are complementary wellness services and are not a substitute for medical
              diagnosis or care. Please disclose any relevant health conditions before your session so we can
              treat you safely. We reserve the right to decline or modify a treatment where it may not be
              appropriate.
            </p>
          </Section>

          <Section title="Conduct">
            <p>
              We are committed to a safe, respectful environment for our clients and team. We may decline
              service to anyone whose conduct is inappropriate or unsafe.
            </p>
          </Section>

          <Section title="Liability">
            <p>
              To the fullest extent permitted by law, {company} is not liable for indirect or incidental
              damages arising from the use of our services or website. Nothing in these terms limits liability
              that cannot be excluded under applicable law.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms? Email us at{" "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
