import { useEffect, useState } from "react";

/**
 * Returns true once user has scrolled past threshold px.
 * Most headers use 40px — triggers backdrop / style change.
 */
export function useScrollState(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

/**
 * Returns current scroll direction: "up" | "down" | "idle".
 * Used by headers that hide-on-scroll-down / show-on-scroll-up.
 */
export function useScrollDirection() {
  const [dir, setDir] = useState<"up" | "down" | "idle">("idle");
  useEffect(() => {
    let last = window.scrollY;
    const handler = () => {
      const curr = window.scrollY;
      if (Math.abs(curr - last) < 8) return;
      setDir(curr > last ? "down" : "up");
      last = curr;
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return dir;
}

export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return mobile;
}
