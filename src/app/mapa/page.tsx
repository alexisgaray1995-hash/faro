import type { Metadata } from "next";
import Link from "next/link";

import { FindHelp } from "@/components/find/FindHelp";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Buscar ayuda y peligros" };

export default async function MapaPage() {
  const locale = await getLocale();
  const t = getDict(locale);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> {t.find.back}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <SyncStatus t={t.sync} />
        </div>
      </div>
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t.find.title}</h1>
        <p className="mt-1 text-muted">{t.find.intro}</p>
      </header>
      <FindHelp t={t.find} locale={locale} />

      <footer className="mt-auto flex flex-col gap-2 pt-4 text-sm text-muted">
        <details>
          <summary className="cursor-pointer">{t.find.exportData}</summary>
          <ul className="mt-2 flex flex-col gap-1 pl-1">
            {(["resources", "hazards", "needs"] as const).map((ds) => (
              <li key={ds} className="flex gap-3">
                <span className="w-20">{t.find.tabs[ds]}</span>
                <a className="underline" href={`/api/export/${ds}?format=csv`}>
                  CSV
                </a>
                <a className="underline" href={`/api/export/${ds}`}>
                  GeoJSON
                </a>
              </li>
            ))}
          </ul>
        </details>
        <Link href="/panel" className="underline">
          {t.find.teamAccess}
        </Link>
      </footer>
    </main>
  );
}
