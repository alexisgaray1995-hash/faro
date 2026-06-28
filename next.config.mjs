import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Offline-first (Golden Rule #1): precache the app shell.
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  // Don't run the SW in dev — it makes hot-reload confusing.
  disable: process.env.NODE_ENV !== "production",
});

// Baseline security headers (Golden Rule #4). Geolocation is intentionally
// allowed for GPS-based SOS.
// ponytail: CSP here is the safe subset (clickjacking, base-tag and form
// hijacking) that doesn't gate script/style loading — so it can't brick the
// app. A full script-src nonce CSP needs runtime testing in a browser; add it
// once there's a staging env to verify it against.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS once seen, so session cookies can't leak over a downgraded
  // connection. Ignored by browsers over plain HTTP, so it's safe in dev.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    // object-src/frame-src 'none' kill plugin- and iframe-injection vectors —
    // the app embeds neither, so this is zero-risk and needs no browser test
    // (unlike a script-src nonce CSP; see DEPLOYMENT.md §7).
    value:
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; " +
      "object-src 'none'; frame-src 'none'",
  },
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
