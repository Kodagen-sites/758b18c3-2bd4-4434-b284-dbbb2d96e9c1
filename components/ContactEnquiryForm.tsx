"use client";

import { useState } from "react";
import { FadeUp } from "@/components/motion";

/**
 * Enquiry form — POSTs /api/inquiries so messages land in the owner's admin
 * inbox (and trigger the notification + auto-reply emails). Success is shown
 * only on ok:true. Surfaces use CSS-var fallbacks so they stay opaque under
 * any tailwind config.
 */
export default function ContactEnquiryForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: process.env.NEXT_PUBLIC_SITE_SLUG,
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          message: String(fd.get("message") ?? ""),
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setStatus("sent");
      else {
        setStatus("error");
        setError(json?.error || "Something went wrong — please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error — please try again.");
    }
  }

  const field =
    "w-full rounded-xl border border-[var(--color-border,rgba(255,255,255,0.14))] bg-[var(--color-card,var(--color-bg,#141416))] px-4 py-3 text-sm text-[var(--color-ink,#f4f4f5)] placeholder-[var(--color-text-secondary,rgba(244,244,245,0.5))] focus:outline-none focus:border-[var(--color-primary,#c9a876)]";

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-[var(--color-border,rgba(255,255,255,0.14))] bg-[var(--color-card,var(--color-bg,#141416))] p-8 text-center">
        <p className="font-display text-xl text-[var(--color-ink,#f4f4f5)]">Message received</p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary,rgba(244,244,245,0.65))]">
          Thank you — we&apos;ll reply shortly. A confirmation is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <FadeUp>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="name" required placeholder="Your name" className={field} />
          <input name="email" type="email" required placeholder="Email address" className={field} />
        </div>
        <input name="phone" placeholder="Phone (optional)" className={field} />
        <textarea name="message" required rows={5} placeholder="How can we help?" className={field} />
        {status === "error" && (
          <p className="rounded-lg bg-[#7f1d1d] px-4 py-2 text-sm text-white">{error}</p>
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="min-h-[48px] w-full rounded-full bg-[var(--color-primary,#c9a876)] px-8 py-3.5 font-display text-sm font-medium text-[var(--color-bg,#17130f)] transition-all hover:brightness-110 disabled:opacity-60 sm:w-auto"
        >
          {status === "sending" ? "Sending…" : "Send enquiry"}
        </button>
      </form>
    </FadeUp>
  );
}
