import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by Serwist at build time with the precache manifest.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache OSM map tiles as they're viewed so the map keeps showing the area a
    // responder already loaded once the signal drops. CacheFirst: a tile never
    // changes, so serve from cache and only hit the network on a miss.
    // ponytail: this only covers tiles already panned over while online — you
    // can't pan to unseen areas offline. For a pre-downloaded region, bundle
    // vector tiles (pmtiles + maplibre); add that only if it's a real ask.
    {
      matcher: ({ url }) =>
        /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname),
      handler: new CacheFirst({
        cacheName: "osm-tiles",
        plugins: [
          // OSM sends CORS headers; accept 200 (CORS) and 0 (opaque) so it
          // works whether or not the tile request was made with crossOrigin.
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 800, // ~a city across a few zoom levels
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            purgeOnQuotaError: true, // evict tiles before failing a real write
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        // When offline and the requested page isn't cached, show /offline.
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
