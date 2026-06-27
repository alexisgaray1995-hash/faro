import type { MetadataRoute } from "next";

// PWA manifest (Spanish-first). Installable on low-end Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Faro — Ayuda en emergencias",
    short_name: "Faro",
    description:
      "Pide ayuda, encuentra agua, comida y refugio, y reporta peligros. Funciona sin internet.",
    lang: "es-VE",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    categories: ["health", "utilities", "navigation"],
    icons: [
      {
        src: "/icons/faro.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/faro-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
