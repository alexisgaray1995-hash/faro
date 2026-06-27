"use client";

import { useEffect, useState } from "react";

type Coords = { lat: number; lng: number };

// ponytail: one shared geolocation request for the whole list — every card
// awaits the same promise instead of prompting N times.
let locPromise: Promise<Coords | null> | null = null;
function getLocationOnce(): Promise<Coords | null> {
  if (!locPromise) {
    locPromise = new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 10000 },
      );
    });
  }
  return locPromise;
}

// Road-distance + ETA from the responder to a need. Renders nothing when there's
// no location permission or OSRM isn't reachable — purely additive.
export function RouteEta({ lat, lng }: { lat: number; lng: number }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLocationOnce()
      .then((loc) => {
        if (!loc) return null;
        return fetch(`/api/route?from=${loc.lat},${loc.lng}&to=${lat},${lng}`);
      })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data: { text?: string } | null) => {
        if (active && data?.text) setText(data.text);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [lat, lng]);

  if (!text) return null;
  return <span>🚗 {text}</span>;
}
