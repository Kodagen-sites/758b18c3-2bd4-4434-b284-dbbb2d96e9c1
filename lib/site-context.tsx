"use client";

import { createContext, useContext, useState } from "react";
import { SiteConfig } from "@/lib/types";

interface SiteContextValue {
  config: SiteConfig;
  basePath: string;
  bookingOpen: boolean;
  setBookingOpen: (open: boolean) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
  config,
  basePath = "",
  children,
}: {
  config: SiteConfig;
  basePath?: string;
  children: React.ReactNode;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <SiteContext.Provider value={{ config, basePath, bookingOpen, setBookingOpen }}>
      <div
        style={
          {
            "--color-primary": config.theme.primaryColor,
            "--color-secondary": config.theme.secondaryColor,
            "--color-accent": config.theme.accentColor,
            "--font-heading": config.theme.fontHeading,
            "--font-body": config.theme.fontBody,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SiteContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSiteConfig must be used within SiteProvider");
  return ctx;
}
