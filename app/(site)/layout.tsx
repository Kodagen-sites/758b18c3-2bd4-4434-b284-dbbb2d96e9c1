import Header from "@/components/headers/Header";
import Footer from "@/components/Footer";
import BookingFlow from "@/components/booking/BookingFlow";
import { CookieConsent } from "@/components/CookieConsent";
import ScrollProgress from "@/components/motion/ScrollProgress";
import { siteConfig } from "@/content/site-config";

// Public-site chrome lives HERE, not in the root layout — /admin and
// /admin/login must never render inside the site header/footer.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {siteConfig.motion.scrollProgress && <ScrollProgress />}
      <BookingFlow>
        <Header />
        <main>{children}</main>
        <Footer />
      </BookingFlow>
      <CookieConsent />
    </>
  );
}
