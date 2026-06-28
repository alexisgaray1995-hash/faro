import type { Dict } from "@/lib/i18n";

// The disclaimer a crisis app must show before anything else: Faro is not an
// emergency dispatcher. Prominent red callout with a one-tap phone link to the
// national emergency line, plus the "data may be wrong, verify" caveat. Pure
// presentational — drop it at the top of any citizen-facing page.
// ponytail: tel:911 is hardcoded to Venezuela's emergency line. Lift to a
// per-region constant when Faro deploys outside Venezuela.
export function SafetyNotice({
  t,
  showAccuracy = true,
}: {
  t: Dict["safety"];
  showAccuracy?: boolean;
}) {
  return (
    <section
      role="note"
      className="rounded-2xl border border-help/40 bg-help/10 p-4"
    >
      <p className="font-semibold text-foreground">{t.emergencyTitle}</p>
      <p className="mt-1 text-sm text-muted">{t.emergencyBody}</p>
      <a
        href="tel:911"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-help px-5 font-semibold text-white"
      >
        {t.emergencyCall}
      </a>
      {showAccuracy && <p className="mt-3 text-xs text-muted">{t.accuracy}</p>}
    </section>
  );
}
