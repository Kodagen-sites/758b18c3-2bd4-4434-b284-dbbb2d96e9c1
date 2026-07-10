"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Generic deep-merge save into kodagen.sites.config (or .theme).
 * Caller passes a partial object that gets merged into the existing JSON.
 */
async function patch(field: "config" | "theme", patch: Record<string, unknown>): Promise<SaveResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "content.edit", ctx.permissions)) {
    return { ok: false, error: "You don't have permission to edit this site." };
  }

  // Authenticated client — writes to kodagen.sites go through the "admins update
  // own site" policy (migration 010). NOTE: this restricts config/theme edits to
  // owner/admin; a non-admin `content.edit` role would be blocked by RLS. If
  // editor-level content editing is needed, add a DEFINER RPC that writes only
  // config/theme after a permission check (RLS can't scope to columns).
  const supabase = await createClient();
  const { data: current, error: readErr } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("sites")
    .select(field)
    .eq("id", ctx.siteId)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  const existing = (current as Record<string, unknown> | null)?.[field] as Record<string, unknown> | undefined;
  const merged = { ...(existing ?? {}), ...patch };
  const { error: writeErr } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("sites")
    .update({ [field]: merged })
    .eq("id", ctx.siteId);
  if (writeErr) return { ok: false, error: writeErr.message };

  // Revalidate every admin route + the whole public site (public routes live
  // at "/", not "/site/<slug>") so getSiteContent()-rendered pages pick up the
  // edit on their next request.
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─── Section-specific savers ────────────────────────────────────────────

export async function saveBusinessIdentity(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const businessName = String(fd.get("businessName") ?? "").trim();
  const logoUrl = String(fd.get("logoUrl") ?? "").trim();
  const logoAlt = String(fd.get("logoAlt") ?? "").trim();
  const favicon = String(fd.get("favicon") ?? "").trim();

  return patch("config", {
    businessName,
    tagline: String(fd.get("tagline") ?? "").trim(),
    // Empty string → clear back to null. Otherwise persist as { path, alt }.
    logo: logoUrl ? { path: logoUrl, alt: logoAlt || businessName } : null,
    favicon: favicon || undefined,
  });
}

export async function saveHero(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    hero: {
      headline:        String(fd.get("headline")        ?? "").trim(),
      subheadline:     String(fd.get("subheadline")     ?? "").trim(),
      ctaText:         String(fd.get("ctaText")         ?? "").trim(),
      ctaLink:         String(fd.get("ctaLink")         ?? "").trim(),
      backgroundImage: String(fd.get("backgroundImage") ?? "").trim(),
    },
  });
}

export async function saveAbout(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    about: {
      title:      String(fd.get("title")      ?? "").trim(),
      mission:    String(fd.get("mission")    ?? "").trim(),
      vision:     String(fd.get("vision")     ?? "").trim(),
      paragraphs: String(fd.get("paragraphs") ?? "")
        .split("\n").map((p) => p.trim()).filter(Boolean),
    },
  });
}

export async function saveContact(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    contact: {
      title:    String(fd.get("title")    ?? "").trim(),
      subtitle: String(fd.get("subtitle") ?? "").trim(),
      address:  String(fd.get("address")  ?? "").trim(),
      phone:    String(fd.get("phone")    ?? "").trim(),
      email:    String(fd.get("email")    ?? "").trim(),
      hours:    String(fd.get("hours")    ?? "").trim(),
    },
  });
}

export async function saveServices(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  // Title/subtitle live in config.services. Bookable rooms come from
  // booking.resources (managed in /admin/rooms). Non-bookable amenities
  // (pool, restaurant, conference) live in config.servicesExtras as an array.
  const extrasJSON = String(fd.get("servicesExtras") ?? "[]");
  let extras: unknown[];
  try {
    const parsed = JSON.parse(extrasJSON);
    extras = Array.isArray(parsed) ? parsed : [];
  } catch {
    return { ok: false, error: "Invalid services JSON." };
  }

  return patch("config", {
    services: {
      title:    String(fd.get("title")    ?? "").trim(),
      subtitle: String(fd.get("subtitle") ?? "").trim(),
    },
    servicesExtras: extras,
  });
}

export async function saveGallery(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    gallery: {
      title:    String(fd.get("title")    ?? "").trim(),
      subtitle: String(fd.get("subtitle") ?? "").trim(),
    },
  });
}

export async function saveFooter(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    footer: {
      copyrightText: String(fd.get("copyrightText") ?? "").trim(),
    },
  });
}

export async function saveWifi(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    wifi: {
      name: String(fd.get("wifiName") ?? "").trim(),
      password: String(fd.get("wifiPassword") ?? "").trim(),
    },
    roomServiceMenu: String(fd.get("roomServiceMenu") ?? "").trim(),
  });
}

export async function saveSEO(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("config", {
    seo: {
      metaTitle:       String(fd.get("metaTitle")       ?? "").trim(),
      metaDescription: String(fd.get("metaDescription") ?? "").trim(),
      keywords:        String(fd.get("keywords")        ?? "")
        .split(",").map((k) => k.trim()).filter(Boolean),
    },
  });
}

export async function saveTheme(_: SaveResult | null, fd: FormData): Promise<SaveResult> {
  return patch("theme", {
    primaryColor:   String(fd.get("primaryColor")   ?? "").trim(),
    secondaryColor: String(fd.get("secondaryColor") ?? "").trim(),
    accentColor:    String(fd.get("accentColor")    ?? "").trim(),
    fontHeading:    String(fd.get("fontHeading")    ?? "").trim(),
    fontBody:       String(fd.get("fontBody")       ?? "").trim(),
    style:          String(fd.get("style")          ?? "elegant").trim(),
  });
}
