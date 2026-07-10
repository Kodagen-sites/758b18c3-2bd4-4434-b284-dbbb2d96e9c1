"use client";

// ============================================================
// EditorBridge — seeded into every Kodagen-generated site.
//
// When the Kodagen Builder hosts the preview in an iframe, it can ask
// this bridge to enter "edit mode" by postMessage. The bridge then:
//   - Outlines whatever <section> the cursor is over
//   - On click, reports the section name back to the Builder so the
//     Kodagen agent knows what the user wants to edit.
//
// The bridge is invisible at runtime when edit mode is off — it adds
// zero visual weight to the live site, just a tiny event listener.
// ============================================================

import { useEffect, useState } from "react";

export default function EditorBridge() {
  const [enabled, setEnabled] = useState(false);

  // Listen for the parent to flip edit mode on/off
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.kind === "kodagen:enable-edit") setEnabled(true);
      else if (data.kind === "kodagen:disable-edit") setEnabled(false);
    }
    window.addEventListener("message", onMessage);
    // Announce readiness to the parent
    try { window.parent?.postMessage({ kind: "kodagen:bridge-ready" }, "*"); } catch {}
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Attach click/hover listeners only while edit mode is on
  useEffect(() => {
    if (!enabled) return;

    // Find the closest ancestor with a data-source attribute (injected by
    // babel-plugin-transform-react-jsx-location at build time). The attr
    // value looks like "components/hero/HeroScrubVideo.tsx:42:8" — gives
    // the editing AI a precise file pointer instead of forcing it to grep.
    //
    // Falls back to a plain <section> walk for legacy projects that
    // haven't been rebuilt with the Babel plugin yet (no data-source
    // attrs in the DOM). In that case the section name is derived from
    // id / className like before; file pointer is unavailable.
    // Tailwind utility class prefixes — used to filter the className
    // fallback so we don't end up calling a section "relative" or "flex".
    const UTILITY_PREFIXES = [
      "relative", "absolute", "fixed", "sticky", "static",
      "flex", "grid", "block", "inline", "hidden",
      "container", "isolate", "overflow", "z-",
      "min-", "max-", "w-", "h-",
      "m-", "mx-", "my-", "mt-", "mr-", "mb-", "ml-",
      "p-", "px-", "py-", "pt-", "pr-", "pb-", "pl-",
      "bg-", "text-", "font-", "border", "rounded",
      "items-", "justify-", "gap-", "space-",
    ];
    const isUtility = (cls: string) => UTILITY_PREFIXES.some((p) => cls === p.replace("-", "") || cls.startsWith(p));

    // Turn a file path into a friendly section name. Examples:
    //   /workspace/components/sections/ScrubHero.tsx → "Scrub Hero"
    //   /workspace/components/motion/HeroScrollText.tsx → "Hero Scroll Text"
    //   /workspace/components/Header.tsx → "Header"
    //   /workspace/app/page.tsx → "page"
    function fileToSectionName(file: string): string {
      const base = file.split("/").pop()?.replace(/\.(tsx?|jsx?)$/i, "") ?? "";
      // CamelCase → "Camel Case"; leave non-PascalCase as-is.
      return base.replace(/([a-z])([A-Z])/g, "$1 $2") || "section";
    }

    function findTarget(el: Element | null): {
      section: string;
      file?: string;
      line?: number;
      col?: number;
      el: HTMLElement;
    } | null {
      // PASS 1 — find the closest ancestor that's an outline-worthy
      // container (section / header / footer / nav / aside / main, OR
      // any element with data-kodagen-section). This becomes the
      // rectangle. We do this first because the visual affordance
      // should hug a meaningful boundary, not arbitrary inner divs.
      let containerEl: HTMLElement | null = null;
      let cur: Element | null = el;
      while (cur && cur !== document.body) {
        const h = cur as HTMLElement;
        const tag = h.tagName.toLowerCase();
        if (
          h.dataset?.kodagenSection ||
          tag === "section" || tag === "header" || tag === "footer" ||
          tag === "nav" || tag === "aside" || tag === "main"
        ) {
          containerEl = h;
          break;
        }
        cur = h.parentElement;
      }
      // Fall back to nearest data-source ancestor if no semantic container
      // found (common for nested layouts that wrap everything in divs).
      if (!containerEl) {
        cur = el;
        while (cur && cur !== document.body) {
          const h = cur as HTMLElement;
          if (h.getAttribute?.("data-source")) { containerEl = h; break; }
          cur = h.parentElement;
        }
      }
      if (!containerEl) return null;

      // PASS 2 — find data-source. Prefer the container itself; else
      // walk UP from the container for a file pointer.
      let file: string | undefined;
      let line: number | undefined;
      let col: number | undefined;
      let dsCur: Element | null = containerEl;
      while (dsCur && dsCur !== document.body) {
        const h = dsCur as HTMLElement;
        const ds = h.getAttribute?.("data-source");
        if (ds) {
          const m = ds.match(/^(.+?):(\d+)(?::(\d+))?$/);
          if (m) { file = m[1]; line = Number(m[2]); col = m[3] ? Number(m[3]) : undefined; break; }
        }
        dsCur = h.parentElement;
      }

      // PASS 3 — name the section. Priority:
      //   1. Explicit data-kodagen-section attr
      //   2. Element id (skip if it looks like a hash/uuid)
      //   3. File basename (ScrubHero → "Scrub Hero") — preferred
      //   4. Tag name (header/footer/nav)
      //   5. Filtered className first non-utility token
      const explicit = containerEl.dataset?.kodagenSection;
      const idAttr = containerEl.id && !/^[0-9a-f]{8,}$/i.test(containerEl.id) ? containerEl.id : "";
      const tag = containerEl.tagName.toLowerCase();
      let sectionName = explicit || idAttr;
      if (!sectionName && file) sectionName = fileToSectionName(file);
      if (!sectionName && (tag === "header" || tag === "footer" || tag === "nav" || tag === "aside" || tag === "main")) {
        sectionName = tag;
      }
      if (!sectionName && typeof containerEl.className === "string") {
        const tokens = containerEl.className.split(/\s+/);
        const semantic = tokens.find((t) => t && !isUtility(t));
        if (semantic) sectionName = semantic;
      }
      sectionName = sectionName || "section";

      return { section: sectionName, file, line, col, el: containerEl };
    }

    let lastHover: HTMLElement | null = null;
    let selected: HTMLElement | null = null;
    let selectedSection = "";

    // Floating label that follows the hovered element — Wix-style
    // affordance so the user always knows what they're about to click.
    const label = document.createElement("div");
    label.style.cssText = [
      "position: fixed",
      "z-index: 2147483647",
      "pointer-events: none",
      "background: #2563eb", // blue-600
      "color: white",
      "font: 600 11px/1 ui-sans-serif, -apple-system, system-ui, sans-serif",
      "padding: 4px 8px",
      "border-radius: 6px",
      "box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35)",
      "letter-spacing: 0.02em",
      "white-space: nowrap",
      "transition: opacity 80ms ease",
      "opacity: 0",
    ].join(";");
    document.body.appendChild(label);

    // Two visual states: HOVER (light blue, transient) + SELECTED
    // (solid blue, persistent until user clicks elsewhere or exits).
    const HOVER_OUTLINE = "2px solid #3b82f6"; // blue-500
    const HOVER_INSET = "inset 0 0 0 9999px rgba(59, 130, 246, 0.07)";
    const SELECTED_OUTLINE = "3px solid #2563eb"; // blue-600, thicker
    const SELECTED_INSET = "inset 0 0 0 9999px rgba(37, 99, 235, 0.12)";

    const clearOutline = (el: HTMLElement | null) => {
      if (!el || el === selected) return; // don't wipe selected state
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.boxShadow = "";
      el.style.cursor = "";
    };
    const paintSelected = (el: HTMLElement) => {
      el.style.outline = SELECTED_OUTLINE;
      el.style.outlineOffset = "-3px";
      el.style.boxShadow = SELECTED_INSET;
    };
    const clearSelected = () => {
      if (selected) {
        selected.style.outline = "";
        selected.style.outlineOffset = "";
        selected.style.boxShadow = "";
        selected.style.cursor = "";
      }
      selected = null;
      selectedSection = "";
    };

    function showLabel(text: string, x: number, y: number) {
      label.textContent = text;
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.opacity = "1";
    }
    function hideLabel() { label.style.opacity = "0"; }

    function onMove(e: MouseEvent) {
      const found = findTarget(e.target as Element);
      if (found?.el === lastHover) {
        if (lastHover && lastHover !== selected) {
          showLabel(label.textContent || "", e.clientX + 12, e.clientY - 28);
        }
        return;
      }
      clearOutline(lastHover);
      if (found && found.el !== selected) {
        // Wix-style hover preview — thin blue outline + soft fill.
        found.el.style.outline = HOVER_OUTLINE;
        found.el.style.outlineOffset = "-2px";
        found.el.style.boxShadow = HOVER_INSET;
        found.el.style.cursor = "pointer";
        lastHover = found.el;
        showLabel(`Edit ${found.section}`, e.clientX + 12, e.clientY - 28);
      } else if (found && found.el === selected) {
        // Hovering over the already-selected element — keep its
        // selected styling, just update the label.
        lastHover = found.el;
        showLabel(`Editing ${found.section} — click another section to switch`, e.clientX + 12, e.clientY - 28);
      } else {
        lastHover = null;
        hideLabel();
      }
    }

    function onLeave() {
      clearOutline(lastHover);
      lastHover = null;
      hideLabel();
    }

    function onClick(e: MouseEvent) {
      const found = findTarget(e.target as Element);
      if (!found) return;
      e.preventDefault();
      e.stopPropagation();
      // Switch selection — clear old, paint new.
      clearSelected();
      selected = found.el;
      selectedSection = found.section;
      paintSelected(selected);
      try {
        window.parent?.postMessage(
          {
            kind: "kodagen:section-clicked",
            section: found.section,
            file: found.file,
            line: found.line,
            col: found.col,
          },
          "*"
        );
      } catch {}
    }

    // Esc → exit edit mode (parent will flip enabled back to false on
    // the kodagen:exit-edit message; falls back to local cleanup if
    // parent doesn't respond).
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearSelected();
        try { window.parent?.postMessage({ kind: "kodagen:exit-edit" }, "*"); } catch {}
      }
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseleave", onLeave, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";

    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseleave", onLeave, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      clearSelected();
      clearOutline(lastHover);
      try { document.body.removeChild(label); } catch { /* already gone */ }
      document.body.style.cursor = prevCursor;
    };
  }, [enabled]);

  return null;
}
