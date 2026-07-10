"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggle: () => {}, ready: false });

function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("admin-theme") as Theme | null;
    if (saved) return saved;
  }
  return "dark";
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Re-read on mount to be safe (SSR hydration)
    const saved = localStorage.getItem("admin-theme") as Theme | null;
    if (saved && saved !== theme) setTheme(saved);
    setReady(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("admin-theme", next);
  };

  // Don't render until we know the theme — prevents flash
  if (!ready) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, ready }}>
      <div className={theme === "dark" ? "dark" : ""}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(ThemeContext);
}
