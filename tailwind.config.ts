import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        ink: "var(--color-ink)",
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        cream: "var(--color-cream)",
        terracotta: "var(--color-terracotta)",
        "text-secondary": "var(--color-text-secondary)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "serif"],
        serif: ["var(--font-display)", "Fraunces", "serif"],
        body: ["var(--font-body)", "Nunito Sans", "sans-serif"],
        sans: ["var(--font-body)", "Nunito Sans", "sans-serif"],
        mono: ["var(--font-mono)", "Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
