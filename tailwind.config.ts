import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // BondXP Design Tokens
        dark: {
          DEFAULT: "#121212",
          50: "#1E1E1E",
          100: "#252525",
          200: "#2E2E2E",
          300: "#3A3A3A",
        },
        primary: {
          DEFAULT: "#FF4D8D",
          50: "#FFE8F0",
          100: "#FFD6E0",
          200: "#FFB3CB",
          300: "#FF8FB1",
          400: "#FF6B9D",
          500: "#FF4D8D",
          600: "#E83578",
          700: "#C01D60",
          800: "#9A0F4B",
          900: "#780639",
        },
        accent: {
          DEFAULT: "#FF8FB1",
          light: "#FFD6E0",
        },
        success: "#6EE7B7",
        warning: "#FBBF24",
        danger: "#F87171",
        info: "#60A5FA",
        
        // Shadcn UI mapped colors
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
      fontFamily: {
        heading: ["var(--font-outfit)", "var(--font-poppins)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
        outfit: ["var(--font-outfit)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #FF4D8D 0%, #FF8FB1 100%)",
        "gradient-dark": "linear-gradient(180deg, #1E1E1E 0%, #121212 100%)",
        "gradient-glow": "radial-gradient(ellipse at center, rgba(255,77,141,0.15) 0%, transparent 70%)",
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
      },
      boxShadow: {
        "glow-primary": "0 0 20px rgba(255, 77, 141, 0.35)",
        "glow-primary-sm": "0 0 10px rgba(255, 77, 141, 0.25)",
        "glow-success": "0 0 20px rgba(110, 231, 183, 0.3)",
        "glow-warning": "0 0 20px rgba(251, 191, 36, 0.3)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.6)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "heartbeat": "heartbeat 1.4s ease-in-out infinite",
        "float-xp": "float-xp 1.5s ease-out forwards",
        "shimmer": "shimmer 2s infinite linear",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
        "flame": "flame 1s ease-in-out infinite alternate",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "bounce-soft": "bounce-soft 0.6s ease-in-out",
        "streak-unlock": "streak-unlock 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      },
      keyframes: {
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "14%": { transform: "scale(1.15)" },
          "28%": { transform: "scale(1)" },
          "42%": { transform: "scale(1.12)" },
          "70%": { transform: "scale(1)" },
        },
        "float-xp": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-60px) scale(1.2)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(255, 77, 141, 0.5)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 12px rgba(255, 77, 141, 0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(255, 77, 141, 0)" },
        },
        flame: {
          "0%": { transform: "scaleY(1) rotate(-2deg)", filter: "brightness(1)" },
          "100%": { transform: "scaleY(1.08) rotate(2deg)", filter: "brightness(1.2)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(255, 77, 141, 0.2)" },
          "50%": { boxShadow: "0 0 25px rgba(255, 77, 141, 0.5)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "streak-unlock": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "60%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
