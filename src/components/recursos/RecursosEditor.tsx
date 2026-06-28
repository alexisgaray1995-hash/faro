"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { RESOURCE_TYPE_LABEL, type ResourceType } from "@/lib/domain";
import { draftsToRows } from "@/lib/supply";
import { enqueue, flush } from "@/lib/sync/outbox";
import {
  SupplyEditor,
  type SupplyMap,
} from "@/components/recursos/SupplyEditor";

const DEFAULT_CENTER: [number, number] = [10.4806, -66.9036]; // Caracas

const RESOURCE_TYPES = Object.entries(RESOURCE_TYPE_LABEL) as [
  ResourceType,
  string,
][];

export function RecursosEditor({ userId }: { userId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [type, setType] = useState<ResourceType>("water_point");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [capacity, setCapacity] = useState("");
  const [supplies, setSupplies] = useState<SupplyMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | null>(null);

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
        crossOrigin: true,
      }).addTo(map);

      const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setCoords([p.lat, p.lng]);
      });
      // Tap anywhere to move the pin.
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setCoords([e.latlng.lat, e.latlng.lng]);
      });

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          if (cancelled || !map) return;
          const here: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          map.setView(here, 15);
          marker.setLatLng(here);
          setCoords(here);
        },
        () => {},
        { timeout: 10000 },
      );
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const id = crypto.randomUUID();
    // Parent first so it lands before its children on flush (FK ordering).
    await enqueue("resources", {
      id,
      type,
      name: name.trim(),
      description: description.trim() || null,
      lat: coords[0],
      lng: coords[1],
      is_open: isOpen,
      capacity_note: capacity.trim() || null,
      created_by: userId,
    });
    for (const row of draftsToRows(supplies)) {
      await enqueue("resource_supplies", {
        resource_id: id,
        category: row.category,
        status: row.status,
        quantity: row.quantity,
        unit: row.unit,
        updated_by: userId,
      });
    }

    const synced = await flush(createClient()).catch(() => 0);
    setResult(synced > 0 ? "sent" : "queued");
    setSubmitting(false);
    // Show the freshly published point right away rather than waiting on the
    // realtime round-trip. (Offline adds wait for sync — nothing to refresh.)
    if (synced > 0) router.refresh();
    // Reset for the next point.
    setName("");
    setDescription("");
    setCapacity("");
    setSupplies({});
    setIsOpen(true);
  }

  return (
    <section className="flex flex-col gap-3">
      <div
        ref={ref}
        className="h-64 w-full overflow-hidden rounded-2xl border border-border bg-surface"
        role="application"
        aria-label="Mapa para ubicar el punto"
      />
      <p className="text-xs text-muted">
        Toca el mapa o arrastra el marcador para ubicar el punto.{" "}
        {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
      </p>

      {result && (
        <p className="rounded-lg bg-beacon/15 px-3 py-2 text-sm text-foreground">
          {result === "sent"
            ? "Punto publicado."
            : "Guardado — se enviará al volver la conexión."}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-foreground">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
          >
            {RESOURCE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          required
          placeholder="Nombre del punto"
          className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Descripción (opcional)"
          className="rounded-xl border border-border bg-surface p-3 text-foreground"
        />

        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          maxLength={200}
          placeholder="Capacidad / nota (opcional)"
          className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />

        <label className="flex items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
            className="h-5 w-5"
          />
          Abierto ahora
        </label>

        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="mb-2 font-medium text-foreground">Suministros</p>
          <SupplyEditor value={supplies} onChange={setSupplies} />
        </div>

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="min-h-[52px] rounded-2xl bg-volunteer px-6 font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando…" : "Agregar punto"}
        </button>
      </form>
    </section>
  );
}
