import type { Metadata } from "next";
import Link from "next/link";

import { SosForm } from "@/components/sos/SosForm";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Pedir ayuda" };

export default async function SosPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> {t.sos.back}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <SyncStatus t={t.sync} />
        </div>
      </div>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {t.sos.title}
        </h1>
        <p className="mt-1 text-muted">{t.sos.subtitle}</p>
      </header>
      <SafetyNotice t={t.safety} />
      <SosForm t={t.sos} locale={locale} />
    </main>
  );
}
