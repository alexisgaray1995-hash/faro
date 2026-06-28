"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";

import { RESOURCE_TYPE_LABEL } from "@/lib/domain";
import { RESOURCE_TYPE_EN, type Dict, type Locale } from "@/lib/i18n";
import { fetchResources, type PublicResource } from "@/lib/data/publicData";
import { PIN_COLOR, pinStatus, supplyLineText } from "@/lib/supply";

// A real, visual map of help-points (water, food, shelter, clinics) so people can
// SEE where to head. Leaflet + OpenStreetMap tiles: free, no API key, no tracking
// (Golden Rules: free, protect people). Tiles viewed online are cached by the
// service worker (osm-tiles in sw.ts), so an already-loaded area still renders
// offline; the cached resource list below works offline regardless.
const EMOJI: Record<PublicResource["type"], string> = {
  water_point: "💧",
  food_distribution: "🍲",
  shelter: "🏠",
  clinic: "🏥",
  charging_station: "🔌",
  distribution_center: "📦",
  other: "📍",
};

// Caracas — a sensible default until geolocation resolves.
const DEFAULT_CENTER: [number, number] = [10.4806, -66.9036];

// Markers render via popups as HTML, so escape any DB-sourced text.
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

export function MapView({ t, locale }: { t: Dict["find"]; locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let map: Leaflet.Map | null = null;
    let cancelled = false;

    (async () => {
      const mod = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current).setView(DEFAULT_CENTER, 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
        // Fetch tiles with CORS so the service worker caches them as clean 200s
        // (see osm-tiles cache in sw.ts) — that's what makes the map work
        // offline once an area has been viewed.
        crossOrigin: true,
      }).addTo(map);

      // Center on the user if they allow it, and drop a "you are here" pin.
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          if (cancelled || !map) return;
          const here: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          map.setView(here, 15);
          L.marker(here, {
            icon: L.divIcon({
              className: "",
              html: `<div style="font-size:20px">🔵</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
            title: t.youAreHere,
          }).addTo(map);
        },
        () => {},
        { timeout: 10000 },
      );

      const typeLabel = (k: PublicResource["type"]) =>
        locale === "en" ? RESOURCE_TYPE_EN[k] : RESOURCE_TYPE_LABEL[k];

      try {
        const { rows, stale } = await fetchResources();
        if (cancelled || !map) return;
        if (stale) setNote(t.stale);
        for (const r of rows) {
          const dir = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`;
          const status = r.is_open ? "" : ` · ${esc(t.closed)}`;
          const color = PIN_COLOR[pinStatus(r.supplies, r.is_open)];
          const supplyHtml =
            r.supplies && r.supplies.length > 0
              ? `<br>${r.supplies.map((s) => esc(supplyLineText(s))).join("<br>")}`
              : "";
          L.marker([r.lat, r.lng], {
            icon: L.divIcon({
              className: "",
              html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5);font-size:16px;opacity:${r.is_open ? 1 : 0.6}">${EMOJI[r.type]}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            }),
            title: r.name,
            opacity: 1,
          })
            .addTo(map)
            .bindPopup(
              `<strong>${esc(r.name)}</strong><br>${EMOJI[r.type]} ${esc(typeLabel(r.type))}${status}` +
                supplyHtml +
                `<br><a href="${dir}" target="_blank" rel="noopener noreferrer">${esc(t.directions)} →</a>`,
            );
        }
      } catch {
        if (!cancelled) setNote(t.error);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [t, locale]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        className="h-72 w-full overflow-hidden rounded-2xl border border-border bg-surface"
        role="application"
        aria-label={t.title}
      />
      <p className="text-xs text-muted">{note ?? t.mapHint}</p>
    </div>
  );
}
