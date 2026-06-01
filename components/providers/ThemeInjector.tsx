"use client";

import { useEffect } from "react";

export interface ThemeConfig {
  colorPrimary?: string;
  colorBg?: string;
  colorCard?: string;
  fontHeading?: string;
  fontBody?: string;
}

export default function ThemeInjector() {
  useEffect(() => {
    // Read theme from localStorage on client load
    const cachedTheme = localStorage.getItem("bondxp-theme");
    if (cachedTheme) {
      try {
        const theme: ThemeConfig = JSON.parse(cachedTheme);
        const root = document.documentElement;

        if (theme.colorPrimary) {
          root.style.setProperty("--color-primary", theme.colorPrimary);
          // Generate a semi-transparent glow color too
          root.style.setProperty("--color-primary-glow", `${theme.colorPrimary}59`);
        }
        if (theme.colorBg) {
          root.style.setProperty("--color-bg", theme.colorBg);
        }
        if (theme.colorCard) {
          root.style.setProperty("--color-card", theme.colorCard);
          // Darken a bit for hover state
          root.style.setProperty("--color-card-hover", `${theme.colorCard}dd`);
        }
        if (theme.fontHeading) {
          root.style.setProperty("--font-heading", `'${theme.fontHeading}', 'Outfit', sans-serif`);
        }
        if (theme.fontBody) {
          root.style.setProperty("--font-body", `'${theme.fontBody}', 'Inter', sans-serif`);
        }
      } catch (e) {
        console.error("Failed to parse cached theme", e);
      }
    }
  }, []);

  return null;
}
