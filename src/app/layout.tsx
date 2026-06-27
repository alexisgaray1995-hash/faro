import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { getLocale } from "@/lib/locale";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  applicationName: "Faro",
  title: {
    default: "Faro — Ayuda en emergencias",
    template: "%s · Faro",
  },
  description:
    "Pide ayuda, encuentra agua, comida y refugio, y reporta peligros. Funciona sin internet.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Faro",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
