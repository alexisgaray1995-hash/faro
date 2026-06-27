"use client";

import Link from "next/link";

import type { Dict } from "@/lib/i18n";

// Shared success screen + location picker for the report forms.
export function ReportResult({
  result,
  t,
}: {
  result: "sent" | "queued";
  t: Dict["report"];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center">
      <p className="text-4xl" aria-hidden>
        {result === "sent" ? "✅" : "📨"}
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground">
        {result === "sent" ? t.sentTitle : t.queuedTitle}
      </h2>
      <p className="mt-2 text-muted">
        {result === "sent" ? t.sentBody : t.queuedBody}
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-beacon px-5 py-2.5 font-medium text-night"
      >
        {t.backHome}
      </Link>
    </div>
  );
}

export function LocationField({
  t,
  coords,
  locating,
  error,
  onLocate,
}: {
  t: Dict["report"];
  coords: { lat: number; lng: number } | null;
  locating: boolean;
  error: string | null;
  onLocate: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-foreground">{t.location}</span>
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        className="min-h-[52px] rounded-xl border border-border bg-surface px-4 font-medium text-foreground disabled:opacity-60"
      >
        {locating ? t.locating : coords ? t.locationReady : t.useLocation}
      </button>
      {coords && (
        <p className="text-sm text-muted">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      )}
      {error && <p className="text-sm text-help">{error}</p>}
    </div>
  );
}
