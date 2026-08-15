import React, { createContext, useContext, useEffect, useState } from "react";

/* ============================================================
   Studio theme (light/dark) — toggles Tailwind's `dark` class
   on <html>. The generated website has its own theme system
   driven by the project config.
   ============================================================ */

type StudioTheme = "dark" | "light";

const ThemeContext = createContext<{ theme: StudioTheme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

const KEY = "katch-studio:theme:v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<StudioTheme>(() => {
    try {
      const saved = localStorage.getItem(KEY) as StudioTheme | null;
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      /* ignore */
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useStudioTheme() {
  return useContext(ThemeContext);
}
