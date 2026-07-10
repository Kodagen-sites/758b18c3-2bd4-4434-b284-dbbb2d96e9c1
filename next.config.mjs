/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Per-tenant Supabase Storage CDN — where generated images/frames live.
      { protocol: "https", hostname: "*.supabase.co" },
      // Platform S3 asset store (+ CloudFront in front of it).
      { protocol: "https", hostname: "*.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
    ],
  },

  // ── Preview cache policy ────────────────────────────────────────────────
  // Kodagen previews are per-project, auth-gated, and dynamic. They must
  // NEVER be stored by any cache — edge proxy, CDN, or browser. Without this,
  // a transient mis-route during the machine suspend→comeback cycle gets the
  // WRONG project's response cached under a preview host and served as stale /
  // cross-project content until TTL or a manual purge.
  //   Observed 2026-05-28: 4c42d050's preview served dae3fa7d's (Sentrion)
  //   page; incognito (no browser cache) showed the correct site, confirming
  //   it was a cache artifact, not a routing/data bug.
  // `no-store` (NOT `no-cache`, which still permits storage) forbids storage
  // outright. Immutable, content-hashed assets under /_next/static + /_next/
  // image keep their default long-lived caching (the hash makes cross-project
  // bleed impossible there).
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
