import type { Metadata } from "next";
import Link from "next/link";

import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { signIn } from "@/lib/auth/actions";
import { getDict } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Acceso para equipos" };

export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale).acceso;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> {t.back}
        </Link>
        <LanguageToggle locale={locale} />
      </div>

      <header>
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-1 text-muted">
          {t.intro}{" "}
          <Link href="/sos" className="underline">
            {t.askHelp}
          </Link>
          .
        </p>
      </header>

      <form action={signIn} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-help/15 px-3 py-2 text-sm text-foreground"
          >
            {t.error}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {t.email}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {t.password}
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
          />
        </label>

        <button
          type="submit"
          className="min-h-[52px] rounded-xl bg-volunteer font-semibold text-white"
        >
          {t.submit}
        </button>
      </form>
    </main>
  );
}
