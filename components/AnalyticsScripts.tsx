import { FK_COL } from '@/lib/db-scope';
import Script from "next/script";
import { createServiceClient } from "@/lib/supabase/server";
import { ConsentGate } from "./ConsentGate";

type Integration = {
  kind: string;
  config: Record<string, string>;
};

async function getEnabledIntegrations(siteId: string): Promise<Integration[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integrations_config")
    .select("kind, config")
    .eq(FK_COL, siteId)
    .eq("enabled", true)
    .in("kind", ["ga4", "meta_pixel", "gtm", "custom_script", "body_script"]);

  return (data ?? []).map((r) => ({
    kind:   r.kind as string,
    config: (r.config ?? {}) as Record<string, string>,
  }));
}

export async function AnalyticsScripts({ siteId }: { siteId: string }) {
  if (!siteId) return null;

  let integrations: Integration[] = [];
  try {
    integrations = await getEnabledIntegrations(siteId);
  } catch {
    return null;
  }

  const ga4        = integrations.find((i) => i.kind === "ga4");
  const metaPixel  = integrations.find((i) => i.kind === "meta_pixel");
  const gtm        = integrations.find((i) => i.kind === "gtm");
  const headScript = integrations.find((i) => i.kind === "custom_script");
  const bodyScript = integrations.find((i) => i.kind === "body_script");

  // Every script here is a non-essential tracker (analytics/marketing) —
  // GDPR/ePrivacy requires opt-in, so injection waits for <CookieConsent />
  // acceptance and fires live the moment the visitor accepts.
  return (
    <ConsentGate>
      {/* ── Google Tag Manager ── */}
      {gtm?.config.container_id && (
        <>
          <Script
            id="gtm-head"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm.config.container_id}');`,
            }}
          />
          {/* GTM noscript fallback injected as a hidden iframe */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm.config.container_id}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {/* ── Google Analytics 4 ── */}
      {ga4?.config.measurement_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4.config.measurement_id}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4.config.measurement_id}');`,
            }}
          />
        </>
      )}

      {/* ── Meta Pixel ── */}
      {metaPixel?.config.pixel_id && (
        <>
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixel.config.pixel_id}');fbq('track','PageView');`,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixel.config.pixel_id}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ── Custom head script ── */}
      {headScript?.config.script && (
        <Script
          id="custom-head-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: headScript.config.script }}
        />
      )}

      {/* ── Custom body script ── */}
      {bodyScript?.config.script && (
        <Script
          id="custom-body-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{ __html: bodyScript.config.script }}
        />
      )}
    </ConsentGate>
  );
}
