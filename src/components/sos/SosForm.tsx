"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  NEED_CATEGORIES,
  URGENCIES,
  type NeedCategory,
  type Urgency,
} from "@/lib/domain";
import { enqueue, flush } from "@/lib/sync/outbox";

type Coords = { lat: number; lng: number };

// Offline-first SOS form: we ALWAYS queue locally first (so a dropped connection
// never loses a cry for help), then try to flush. No login required.
export function SosForm() {
  const [category, setCategory] = useState<NeedCategory>("rescue");
  const [urgency, setUrgency] = useState<Urgency>("high");
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | null>(null);

  function getLocation() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError(
        "Tu dispositivo no permite ubicación. Escribe una referencia abajo.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError(
          "No pudimos obtener tu ubicación. Escribe una referencia abajo.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) {
      setLocError("Necesitamos tu ubicación para enviar ayuda.");
      return;
    }
    setSubmitting(true);
    await enqueue("needs", {
      category,
      urgency,
      people_count: people,
      description: description.trim() || null,
      lat: coords.lat,
      lng: coords.lng,
      address_note: address.trim() || null,
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
    });
    const synced = await flush(createClient()).catch(() => 0);
    setResult(synced > 0 ? "sent" : "queued");
    setSubmitting(false);
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-4xl" aria-hidden>
          {result === "sent" ? "✅" : "📨"}
        </p>
        <h2 className="mt-3 text-xl font-bold text-foreground">
          {result === "sent"
            ? "Ayuda solicitada"
            : "Guardado — se enviará al volver el internet"}
        </h2>
        <p className="mt-2 text-muted">
          {result === "sent"
            ? "Tu pedido llegó. Un equipo lo revisará y verificará."
            : "Tu pedido está guardado en este teléfono y se enviará solo cuando haya conexión. Puedes cerrar la app."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-beacon px-5 py-2.5 font-medium text-night"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium text-foreground">
          ¿Qué necesitas?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {NEED_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={category === c.value}
              onClick={() => setCategory(c.value)}
              className={`min-h-[52px] rounded-xl border px-3 text-center font-medium ${
                category === c.value
                  ? "border-help bg-help/15 text-foreground"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">Urgencia</span>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as Urgency)}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
        >
          {URGENCIES.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">¿Cuántas personas?</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={10000}
          value={people}
          onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">
          Describe la situación (opcional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className="rounded-xl border border-border bg-surface p-3 text-foreground"
          placeholder="Ej: personas atrapadas en el segundo piso"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-foreground">Tu ubicación</span>
        <button
          type="button"
          onClick={getLocation}
          disabled={locating}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-4 font-medium text-foreground disabled:opacity-60"
        >
          {locating
            ? "Obteniendo ubicación…"
            : coords
              ? "✓ Ubicación lista — actualizar"
              : "📍 Usar mi ubicación"}
        </button>
        {coords && (
          <p className="text-sm text-muted">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
        {locError && <p className="text-sm text-help">{locError}</p>}
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={500}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
          placeholder="Referencia: calle, edificio, punto conocido"
        />
      </div>

      <details className="rounded-xl border border-border bg-surface p-3">
        <summary className="cursor-pointer font-medium text-foreground">
          Datos de contacto (opcional)
        </summary>
        <p className="mt-2 text-sm text-muted">
          Solo los equipos de rescate verán esto. Ayuda a que te encuentren.
        </p>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          maxLength={120}
          className="mt-3 min-h-[52px] w-full rounded-xl border border-border bg-night px-3 text-foreground"
          placeholder="Nombre"
        />
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          maxLength={30}
          className="mt-2 min-h-[52px] w-full rounded-xl border border-border bg-night px-3 text-foreground"
          placeholder="Teléfono"
        />
      </details>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[60px] rounded-2xl bg-help px-6 text-lg font-bold text-white disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Enviar pedido de ayuda"}
      </button>
      <p className="text-center text-sm text-muted">
        Funciona sin internet. Tu pedido se guarda y se envía solo.
      </p>
    </form>
  );
}
