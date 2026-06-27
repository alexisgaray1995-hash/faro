import type { Metadata } from "next";
import Link from "next/link";

import { ReportHazard } from "@/components/report/ReportHazard";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Reportar un peligro" };

export default async function PeligroPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> {t.report.back}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <SyncStatus t={t.sync} />
        </div>
      </div>
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t.hazard.title}</h1>
        <p className="mt-1 text-muted">{t.hazard.subtitle}</p>
      </header>
      <ReportHazard t={t.hazard} rt={t.report} locale={locale} />
    </main>
  );
}
