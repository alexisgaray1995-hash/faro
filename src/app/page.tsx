import { Brand } from "@/components/ui/Brand";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { RoleButton } from "@/components/ui/RoleButton";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { ROLES } from "@/lib/constants";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDict(locale);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 py-8">
      <header className="flex items-center justify-between gap-2">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <SyncStatus t={t.sync} />
        </div>
      </header>

      <div>
        <h1 className="text-balance text-3xl font-bold leading-tight text-foreground">
          {t.home.heading}
        </h1>
        <p className="mt-2 text-muted">{t.home.intro}</p>
      </div>

      <nav aria-label={t.home.chooseLabel} className="flex flex-col gap-4">
        {ROLES.map((entry) => (
          <RoleButton key={entry.role} entry={entry} locale={locale} />
        ))}
      </nav>

      <footer className="mt-auto text-sm text-muted">
        <p>{t.home.footer}</p>
      </footer>
    </main>
  );
}
