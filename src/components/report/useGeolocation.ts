"use client";

import { useState } from "react";

export type Coords = { lat: number; lng: number };

// Shared GPS helper for the report forms. ponytail: SosForm keeps its own
// (tested) inline copy; fold it in here only if a fourth caller appears.
export function useGeolocation(msg: { noGeo: string; geoFailed: string }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function locate() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError(msg.noGeo);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError(msg.geoFailed);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return { coords, locating, error, setError, locate };
}
