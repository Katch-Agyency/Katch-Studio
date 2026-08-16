import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Katch Studio palette — applied as CSS variables at runtime
        // (theme-aware, driven by src/index.css token block)
        surface: {
          0: "rgb(var(--ks-surface-0-rgb) / <alpha-value>)",
          1: "rgb(var(--ks-surface-1-rgb) / <alpha-value>)",
          2: "rgb(var(--ks-surface-2-rgb) / <alpha-value>)",
          3: "rgb(var(--ks-surface-3-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ks-ink-rgb) / <alpha-value>)",
          muted: "rgb(var(--ks-ink-muted-rgb) / <alpha-value>)",
          faint: "rgb(var(--ks-ink-faint-rgb) / <alpha-value>)",
        },
        line: {
          DEFAULT: "var(--ks-line)",
          strong: "var(--ks-line-strong)",
        },
        brand: {
          DEFAULT: "rgb(var(--ks-brand-rgb) / <alpha-value>)",
          hover: "rgb(var(--ks-brand-hover-rgb) / <alpha-value>)",
          muted: "var(--ks-brand-muted)",
          ring: "var(--ks-brand-ring)",
        },
        accent: {
          DEFAULT: "rgb(var(--ks-brand-rgb) / <alpha-value>)",
          muted: "var(--ks-brand-muted)",
        },
        // The Katch accent as a FILL — always #D7FF4F with dark ink on top
        katch: {
          DEFAULT: "var(--ks-accent)",
          hover: "var(--ks-accent-hover)",
          ink: "var(--ks-accent-ink)",
        },
        ok: "#34d399",
        warn: "#fbbf24",
        danger: {
          DEFAULT: "#f87171",
          muted: "rgba(248,113,113,0.12)",
        },
        info: "#60a5fa",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Sora",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        arabic: ["Noto Naskh Arabic", "Noto Kufi Arabic", "Segoe UI", "Tahoma", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,10,20,0.04), 0 8px 24px -12px rgba(10,10,20,0.18)",
        pop: "0 8px 16px -6px rgba(10,10,20,0.16), 0 24px 48px -16px rgba(10,10,20,0.28)",
        soft: "0 1px 3px rgba(10,10,20,0.06), 0 12px 32px -16px rgba(10,10,20,0.24)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.98) translateY(6px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.28s cubic-bezier(0.21, 1.02, 0.73, 1) both",
        "fade-in": "fade-in 0.2s ease-out both",
        "scale-in": "scale-in 0.22s cubic-bezier(0.21, 1.02, 0.73, 1) both",
        "toast-in": "toast-in 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
