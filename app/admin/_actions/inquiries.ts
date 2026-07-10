"use server";
import { FK_COL, KODAGEN_SCHEMA, BOOKING_SCHEMA, withSchema } from '@/lib/db-scope';
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSite } from "@/lib/site-scope";
import { hasPermission } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ALLOWED_STATUSES = ["new", "read", "replied", "archived"] as const;
type InquiryStatus = (typeof ALLOWED_STATUSES)[number];

async function setStatus(id: string, status: InquiryStatus): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "inquiries.reply", ctx.permissions)) return { ok: false, error: "No permission." };
  if (!id) return { ok: false, error: "Missing id." };

  const supabase = await createClient();
  const { error } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .eq(FK_COL, ctx.siteId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { ok: true };
}

export async function markInquiryRead(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return setStatus(String(fd.get("id") ?? ""), "read");
}
export async function markInquiryReplied(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return setStatus(String(fd.get("id") ?? ""), "replied");
}
export async function archiveInquiry(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return setStatus(String(fd.get("id") ?? ""), "archived");
}
export async function deleteInquiry(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCurrentSite();
  if (!ctx) return { ok: false, error: "Not signed in." };
  if (!hasPermission(ctx.role, "inquiries.reply", ctx.permissions)) return { ok: false, error: "No permission." };
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id." };

  const supabase = await createClient();
  const { error } = await withSchema(supabase, KODAGEN_SCHEMA)
    .from("inquiries")
    .delete()
    .eq("id", id)
    .eq(FK_COL, ctx.siteId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/inquiries");
  return { ok: true };
}
