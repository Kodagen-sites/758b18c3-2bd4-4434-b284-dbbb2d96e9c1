import assetManifest from "@/content/asset-manifest.json";
import { resolveImage } from "@/lib/image-fallback";

type Manifest = {
  images?: Record<string, string>;
  videos?: Record<string, string>;
};

const M = assetManifest as Manifest;

function valid(u?: string): u is string {
  return typeof u === "string" && u.length > 4;
}

/**
 * Resolve a brand image by its asset-manifest slot (e.g. "service-deep-tissue-massage",
 * "section-mockup", "scene-1-start"). Falls back to a brand-tinted gradient so a
 * slot the pipeline hasn't filled yet never renders as a broken image.
 */
export function assetImage(slot: string, keyword?: string): string {
  const url = M.images?.[slot];
  if (valid(url)) return url;
  return resolveImage({ industry: "spa", keyword, brandColor: "#C9A876" });
}

/** The looping hero clip (content/asset-manifest.json videos["scene-1"]). */
export function heroVideo(): string | undefined {
  const v = M.videos?.["scene-1"];
  return valid(v) ? v : undefined;
}
