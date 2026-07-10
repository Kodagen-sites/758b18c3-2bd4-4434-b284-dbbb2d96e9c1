/**
 * Social brand icons — inline SVG, no dependency.
 *
 * lucide-react (the build's icon library) dropped brand/logo glyphs for
 * trademark reasons, so Facebook/Instagram/LinkedIn/X/etc. are shipped here
 * as inline SVG paths. They inherit `currentColor`, so they recolor with
 * the footer's text color and hover states.
 *
 * Scaffold step: copy to components/ui/social-icons.tsx (or components/
 * social-icons.tsx). The Footer renders <SocialLinks /> with the brand's
 * siteConfig.socials object.
 *
 * Supported platforms: facebook, instagram, linkedin, x (twitter), youtube,
 * tiktok, threads, pinterest, whatsapp. Unknown keys fall back to a generic
 * globe so the build never crashes on an unexpected platform.
 */
import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
  ...props,
});

function Facebook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07c0 6 4.39 10.97 10.13 11.86v-8.39H7.08v-3.47h3.05V9.43c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.5 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.47h-2.8v8.39C19.61 23.04 24 18.07 24 12.07Z" />
    </svg>
  );
}

function Instagram(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-10.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
    </svg>
  );
}

function LinkedIn(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0Z" />
    </svg>
  );
}

function X(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.3L17.61 20.65Z" />
    </svg>
  );
}

function YouTube(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  );
}

function TikTok(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 3.79-4.25V9.6a6.33 6.33 0 0 0-5.2 9.57 6.34 6.34 0 0 0 10.86-4.43V8.18a8.16 8.16 0 0 0 4.77 1.53V6.69h-.8Z" />
    </svg>
  );
}

function Threads(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12.18 24h-.01c-3.99-.03-7.06-1.34-9.13-3.91C1.18 17.83.27 14.66.24 12.01v-.02c.03-2.65.94-5.82 2.8-8.08C5.1 1.34 8.18.03 12.17 0h.02c3.06.02 5.6.8 7.57 2.32 1.84 1.43 3.13 3.46 3.84 6.04l-2.12.59c-1.2-4.31-4.25-6.52-9.3-6.55-3.33.02-5.85 1.07-7.5 3.1C3.46 7.42 2.7 10.08 2.67 12c.03 1.92.79 4.58 2.34 6.5 1.64 2.03 4.16 3.08 7.49 3.1 3-.02 4.99-.73 6.65-2.36 1.89-1.86 1.86-4.15 1.25-5.54-.36-.82-1.02-1.5-1.9-2.01-.22 1.56-.72 2.83-1.49 3.78-1.03 1.27-2.5 1.96-4.36 2.06-1.41.07-2.76-.26-3.81-.94-1.24-.8-1.96-2.03-2.04-3.46-.16-2.83 2.1-4.86 5.62-5.06 1.25-.07 2.42-.02 3.5.17-.14-.87-.43-1.56-.87-2.06-.6-.69-1.53-1.04-2.76-1.05h-.04c-.99 0-2.33.27-3.19 1.55l-1.76-1.18c1.15-1.71 3.01-2.65 5.24-2.65h.06c3.73.02 5.95 2.31 6.17 6.3.13.06.25.11.37.17 1.77 1.01 3.07 2.55 3.49 5.13.4 2.46-.07 5.31-2.45 7.66C18.97 23.08 16.4 23.98 12.18 24Z" />
    </svg>
  );
}

function Pinterest(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.62 11.16-.11-.95-.2-2.4.04-3.44.22-.93 1.4-5.95 1.4-5.95s-.36-.72-.36-1.78c0-1.66.97-2.91 2.17-2.91 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.2.6 2.17 1.79 2.17 2.15 0 3.8-2.27 3.8-5.54 0-2.9-2.08-4.92-5.05-4.92-3.44 0-5.46 2.58-5.46 5.25 0 1.04.4 2.16.9 2.76.1.12.11.23.08.35l-.34 1.36c-.05.22-.17.27-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.75-7.25 7.92-7.25 4.16 0 7.39 2.96 7.39 6.92 0 4.13-2.6 7.45-6.22 7.45-1.21 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0Z" />
    </svg>
  );
}

function WhatsApp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M.06 24l1.69-6.16a11.87 11.87 0 0 1-1.59-5.95C.16 5.34 5.5 0 12.06 0a11.82 11.82 0 0 1 8.41 3.49 11.82 11.82 0 0 1 3.48 8.41c0 6.56-5.34 11.9-11.9 11.9a11.9 11.9 0 0 1-5.7-1.45L.06 24ZM6.6 20.13c1.68 1 3.28 1.59 5.4 1.59 5.45 0 9.89-4.43 9.9-9.88a9.88 9.88 0 0 0-16.86-7 9.82 9.82 0 0 0-2.9 7 9.82 9.82 0 0 0 1.5 5.25l-1 3.65 3.96-.61Zm11.9-5.59c-.07-.12-.27-.2-.56-.34-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37s-1.06 1.04-1.06 2.51 1.09 2.9 1.24 3.1c.15.2 2.13 3.26 5.17 4.57.72.31 1.29.5 1.73.64.73.23 1.39.2 1.91.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.18-1.42Z" />
    </svg>
  );
}

function Globe(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

export type SocialPlatform =
  | "facebook" | "instagram" | "linkedin" | "x" | "twitter"
  | "youtube" | "tiktok" | "threads" | "pinterest" | "whatsapp";

/** platform key → icon component. `twitter` aliases `x`. */
export const socialIconMap: Record<string, (p: IconProps) => ReactElement> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: LinkedIn,
  x: X,
  twitter: X,
  youtube: YouTube,
  tiktok: TikTok,
  threads: Threads,
  pinterest: Pinterest,
  whatsapp: WhatsApp,
};

const LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  x: "X", twitter: "X", youtube: "YouTube", tiktok: "TikTok",
  threads: "Threads", pinterest: "Pinterest", whatsapp: "WhatsApp",
};

/**
 * Renders one accessible link per non-empty socials entry.
 *
 *   <SocialLinks socials={siteConfig.socials} />
 *
 * `socials` is an object like { instagram: "https://...", linkedin: "https://..." }.
 * Empty-string values are skipped. Unknown platforms get a globe icon.
 * Icons inherit currentColor — style the wrapper, not the SVG.
 */
export function SocialLinks({
  socials,
  className = "",
  iconClassName = "h-5 w-5",
}: {
  socials: Record<string, string | undefined | null>;
  className?: string;
  iconClassName?: string;
}) {
  const entries = Object.entries(socials ?? {}).filter(
    ([, url]) => typeof url === "string" && url.trim().length > 0
  );
  if (entries.length === 0) return null;
  return (
    <ul className={`flex items-center gap-3 ${className}`}>
      {entries.map(([platform, url]) => {
        const Icon = socialIconMap[platform.toLowerCase()] ?? Globe;
        const label = LABEL[platform.toLowerCase()] ?? platform;
        return (
          <li key={platform}>
            <a
              href={url as string}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex items-center justify-center opacity-70 transition-opacity hover:opacity-100"
            >
              <Icon className={iconClassName} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
