"use client";

import { useEffect } from "react";

/**
 * MOTION — EntranceSequencer
 *
 * Scans the DOM for elements tagged with `data-reveal` and progressively adds
 * a `revealed` class (plus optional `delay-N` class) as they enter the
 * viewport. The actual animation is defined in CSS — the component just
 * orchestrates when each element "lights up."
 *
 * Pattern extracted from Axiom Lab + Source 4 + Source 10 references. All of
 * them implement the same thing by hand: find elements, observe, stagger
 * their reveal with an index-based delay. It shows up so consistently it
 * belongs in the motion vocabulary instead of being rewritten per page.
 *
 * Usage in markup:
 *   <h2 data-reveal>Heading</h2>
 *   <p data-reveal data-delay="1">Subhead fades in 0.1s later</p>
 *   <div data-reveal data-delay="2" data-stagger-group="hero">Third, in a named group</div>
 *
 * Usage in CSS (your design system should ship this once):
 *   [data-reveal]          { opacity: 0; transform: translateY(30px);
 *                            transition: opacity .8s cubic-bezier(.16,1,.3,1),
 *                                        transform .8s cubic-bezier(.16,1,.3,1); }
 *   [data-reveal].revealed { opacity: 1; transform: translateY(0); }
 *   [data-reveal].delay-1  { transition-delay: 0.1s; }
 *   [data-reveal].delay-2  { transition-delay: 0.2s; }
 *   [data-reveal].delay-3  { transition-delay: 0.3s; }
 *   [data-reveal].delay-4  { transition-delay: 0.4s; }
 *
 * The primitive itself has no visual output — it's pure behavior. Mount it
 * once near the root of the app. Handles both initially-rendered and
 * dynamically-added elements (re-scans on MutationObserver).
 *
 * Props let you customize the threshold, root margin, and whether to
 * auto-stagger children of a `data-stagger-group` container (delay is
 * computed from the child index if no explicit data-delay is present).
 */

type Props = {
  /**
   * IntersectionObserver threshold. 0.1 = fire when 10% of the element is
   * visible. Default 0.1.
   */
  threshold?: number;
  /**
   * IntersectionObserver rootMargin. Default "0px 0px -10% 0px" — fires
   * slightly before the element fully enters, for better perceived responsiveness.
   */
  rootMargin?: string;
  /**
   * When true (default), children inside `[data-stagger-group]` containers
   * get an auto-assigned data-delay based on their index if they don't
   * already have one.
   */
  autoStagger?: boolean;
  /**
   * Maximum `delay-N` class number supported by your CSS. Default 6. If a
   * child's index exceeds this, the class saturates (e.g., child 10 gets
   * delay-6 not delay-10 — avoids runaway stagger and missing CSS rules).
   */
  maxDelay?: number;
};

export default function EntranceSequencer({
  threshold = 0.1,
  rootMargin = "0px 0px -10% 0px",
  autoStagger = true,
  maxDelay = 6,
}: Props) {
  useEffect(() => {
    // Respect prefers-reduced-motion: mark everything as revealed immediately,
    // skipping the transition. CSS authors should also set
    // `transition: none` under the media query — defence in depth.
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.classList.add("revealed");
      });
      return;
    }

    const assignAutoStagger = (root: ParentNode) => {
      if (!autoStagger) return;
      root
        .querySelectorAll<HTMLElement>("[data-stagger-group]")
        .forEach((group) => {
          const kids = group.querySelectorAll<HTMLElement>("[data-reveal]");
          kids.forEach((k, i) => {
            if (!k.hasAttribute("data-delay")) {
              const d = Math.min(i, maxDelay);
              k.setAttribute("data-delay", String(d));
            }
          });
        });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const delay = el.dataset.delay;
            el.classList.add("revealed");
            if (delay) {
              const n = Math.min(Number(delay) || 0, maxDelay);
              if (n > 0) el.classList.add(`delay-${n}`);
            }
            observer.unobserve(el);
          }
        });
      },
      { threshold, rootMargin }
    );

    const observeAll = (root: ParentNode) => {
      assignAutoStagger(root);
      root
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.revealed)")
        .forEach((el) => observer.observe(el));
    };

    // Initial sweep.
    observeAll(document.body);

    // Watch for dynamically-added reveal elements (e.g. client-side routing,
    // lazy-mounted sections). Batches on rAF to avoid thrashing on large
    // DOM updates.
    let pending = false;
    const mutation = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        observeAll(document.body);
      });
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, [threshold, rootMargin, autoStagger, maxDelay]);

  return null;
}
