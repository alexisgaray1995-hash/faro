"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  HAZARD_TYPE_LABEL,
  URGENCIES,
  type HazardType,
  type Urgency,
} from "@/lib/domain";
import { HAZARD_TYPE_EN, URGENCY_EN, type Dict, type Locale } from "@/lib/i18n";
import { enqueue, flush } from "@/lib/sync/outbox";
import { LocationField, ReportResult } from "@/components/report/shared";
import { useGeolocation } from "@/components/report/useGeolocation";

const HAZARD_TYPES = Object.keys(HAZARD_TYPE_LABEL) as HazardType[];

export function ReportHazard({
  t,
  rt,
  locale,
}: {
  t: Dict["hazard"];
  rt: Dict["report"];
  locale: Locale;
}) {
  const [type, setType] = useState<HazardType>("building_collapse");
  const [severity, setSeverity] = useState<Urgency>("high");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | null>(null);
  const geo = useGeolocation(rt);

  const typeLabel = (k: HazardType) =>
    locale === "en" ? HAZARD_TYPE_EN[k] : HAZARD_TYPE_LABEL[k];
  const urgLabel = (u: Urgency, es: string) =>
    locale === "en" ? URGENCY_EN[u] : es;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!geo.coords) {
      geo.setError(t.needLocation);
      return;
    }
    setSubmitting(true);
    await enqueue("hazards", {
      type,
      severity,
      description: description.trim() || null,
      lat: geo.coords.lat,
      lng: geo.coords.lng,
    });
    const synced = await flush(createClient()).catch(() => 0);
    setResult(synced > 0 ? "sent" : "queued");
    setSubmitting(false);
  }

  if (result) return <ReportResult result={result} t={rt} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{t.type}</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as HazardType)}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
        >
          {HAZARD_TYPES.map((k) => (
            <option key={k} value={k}>
              {typeLabel(k)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{t.severity}</span>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Urgency)}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
        >
          {URGENCIES.map((u) => (
            <option key={u.value} value={u.value}>
              {urgLabel(u.value, u.label)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{t.describe}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className="rounded-xl border border-border bg-surface p-3 text-foreground"
          placeholder={t.describePlaceholder}
        />
        <span className="text-sm text-muted">⚠️ {t.describePublic}</span>
      </label>

      <LocationField
        t={rt}
        coords={geo.coords}
        locating={geo.locating}
        error={geo.error}
        onLocate={geo.locate}
      />

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[60px] rounded-2xl bg-beacon px-6 text-lg font-bold text-night disabled:opacity-60"
      >
        {submitting ? rt.submitting : t.submit}
      </button>
      <p className="text-center text-sm text-muted">{rt.worksOffline}</p>
    </form>
  );
}
