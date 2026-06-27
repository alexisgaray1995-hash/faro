import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Offline-first (Golden Rule #1): precache the app shell.
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  // Don't run the SW in dev — it makes hot-reload confusing.
  disable: process.env.NODE_ENV !== "production",
});

// Baseline security headers (Golden Rule #4). A strict CSP is added in the
// M8 hardening pass; geolocation is intentionally allowed for GPS-based SOS.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), microphone=(self), camera=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root — a stray lockfile higher up confuses Next's
  // auto-detection. The production build uses webpack (see `build` script) so
  // Serwist's webpack plugin can emit the offline service worker.
  turbopack: { root: import.meta.dirname },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
