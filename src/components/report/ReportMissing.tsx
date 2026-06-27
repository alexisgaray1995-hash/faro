"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Dict } from "@/lib/i18n";
import { enqueue, flush } from "@/lib/sync/outbox";
import { LocationField, ReportResult } from "@/components/report/shared";
import { useGeolocation } from "@/components/report/useGeolocation";

export function ReportMissing({
  t,
  rt,
}: {
  t: Dict["missing"];
  rt: Dict["report"];
}) {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | null>(null);
  const geo = useGeolocation(rt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError(t.needName);
      return;
    }
    setError(null);
    setSubmitting(true);
    const ageNum = Number(age);
    await enqueue("missing_persons", {
      full_name: fullName.trim(),
      age: age && ageNum > 0 ? Math.min(ageNum, 130) : null,
      description: description.trim() || null,
      last_seen_note: lastSeen.trim() || null,
      last_seen_lat: geo.coords?.lat ?? null,
      last_seen_lng: geo.coords?.lng ?? null,
      reporter_name: reporterName.trim() || null,
      reporter_phone: reporterPhone.trim() || null,
    });
    const synced = await flush(createClient()).catch(() => 0);
    setResult(synced > 0 ? "sent" : "queued");
    setSubmitting(false);
  }

  if (result) return <ReportResult result={result} t={rt} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{t.fullName}</span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={120}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{t.age}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={130}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium text-foreground">{t.lastSeen}</span>
        <input
          type="text"
          value={lastSeen}
          onChange={(e) => setLastSeen(e.target.value)}
          maxLength={500}
          className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
          placeholder={t.lastSeenPlaceholder}
        />
      </label>

      <LocationField
        t={rt}
        coords={geo.coords}
        locating={geo.locating}
        error={geo.error}
        onLocate={geo.locate}
      />

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
      </label>

      <details className="rounded-xl border border-border bg-surface p-3">
        <summary className="cursor-pointer font-medium text-foreground">
          {t.contactSummary}
        </summary>
        <p className="mt-2 text-sm text-muted">{t.contactNote}</p>
        <input
          type="text"
          value={reporterName}
          onChange={(e) => setReporterName(e.target.value)}
          maxLength={120}
          className="mt-3 min-h-[52px] w-full rounded-xl border border-border bg-night px-3 text-foreground"
          placeholder={t.reporterName}
        />
        <input
          type="tel"
          value={reporterPhone}
          onChange={(e) => setReporterPhone(e.target.value)}
          maxLength={30}
          className="mt-2 min-h-[52px] w-full rounded-xl border border-border bg-night px-3 text-foreground"
          placeholder={t.reporterPhone}
        />
      </details>

      {error && <p className="text-sm text-help">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[60px] rounded-2xl bg-coordinator px-6 text-lg font-bold text-white disabled:opacity-60"
      >
        {submitting ? rt.submitting : t.submit}
      </button>
      <p className="text-center text-sm text-muted">{rt.worksOffline}</p>
    </form>
  );
}
