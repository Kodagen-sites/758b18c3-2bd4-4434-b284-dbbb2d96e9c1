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
  title: "Privacy Policy",
  description: `How ${company} collects, uses, and protects your personal information.`,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-cream font-light mb-3">{title}</h2>
      <div className="space-y-3 text-cream/70 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        image={assetImage("section-mockup", "calm spa interior")}
        intro={`How ${company} collects, uses, and safeguards your information.`}
      />
      <div className="bg-bg px-5 py-20 md:px-10">
        <div className="mx-auto max-w-[760px]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/80 mb-10">
            Effective {effectiveDate}
          </p>

          <Section title="Introduction">
            <p>
              {company} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy. This
              policy explains what information we collect when you visit our clinic or website, book a
              treatment, or contact us, and how we use and protect it. We operate in {jurisdiction}.
            </p>
          </Section>

          <Section title="Information we collect">
            <p>
              We collect information you provide directly — such as your name, email, phone number, and any
              health or wellness details you share when booking a treatment or consultation. We also collect
              limited technical data (such as pages visited) to improve our website.
            </p>
          </Section>

          <Section title="How we use your information">
            <p>
              We use your information to schedule and deliver treatments, tailor your care, respond to
              enquiries, and — with your consent — send occasional wellness updates. We never sell your
              personal information.
            </p>
          </Section>

          <Section title="Health information">
            <p>
              Any health information you share is treated with the utmost confidentiality and used solely to
              provide safe, appropriate care. Access is limited to the therapists and practitioners involved
              in your treatment.
            </p>
          </Section>

          <Section title="Data retention & security">
            <p>
              We retain your information only as long as necessary to provide our services and meet legal
              obligations, and we apply appropriate safeguards to protect it against unauthorised access.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You may request access to, correction of, or deletion of your personal information at any time.
              To exercise these rights, email us at{" "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>
              .
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy? Reach us at{" "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>{" "}
              or visit us at {jurisdiction}.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
