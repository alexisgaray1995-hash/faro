import type { Config } from "tailwindcss";

const config: Config = {
  // Dark mode is toggled by a class on <html> (battery saving on OLED).
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",
        muted: "var(--muted)",
        // Faro brand: a calm amber beacon over deep night blue.
        beacon: {
          DEFAULT: "#f5b301",
          soft: "#fcd34d",
          deep: "#c98a00",
        },
        night: {
          DEFAULT: "#0b1220",
          800: "#131c2b",
          700: "#1c2840",
        },
        // Role / action colors — high contrast, never relying on color alone.
        help: "#dc2626", // SOS / "Necesito ayuda"
        volunteer: "#16a34a", // "Quiero ayudar"
        coordinator: "#2563eb", // "Soy coordinador"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
