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
        beacon: "#f5b301",
        night: "#0b1220",
        // Role / action colors — high contrast, never relying on color alone.
        help: "#dc2626", // SOS / "Necesito ayuda"
        volunteer: "#16a34a", // "Quiero ayudar"
        coordinator: "#2563eb", // "Soy coordinador"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
