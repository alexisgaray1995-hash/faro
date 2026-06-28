import Link from "next/link";

import type { Locale } from "@/lib/i18n";

// Shared layout for the two legal documents (Términos, Privacidad). Pure
// presentational: each page picks the es/en content and hands it over. Keeps the
// long prose out of i18n.ts while still rendering bilingually.
export type LegalSection = { heading: string; body: string[] };
export type LegalContent = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  note: string;
};

export function LegalDoc({
  locale,
  content,
  otherHref,
  otherLabel,
}: {
  locale: Locale;
  content: LegalContent;
  otherHref: string;
  otherLabel: string;
}) {
  const backLabel = locale === "en" ? "Home" : "Inicio";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <span aria-hidden>←</span> {backLabel}
      </Link>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {content.title}
        </h1>
        <p className="mt-1 text-xs text-muted">{content.updated}</p>
        <p className="mt-3 text-pretty text-muted">{content.intro}</p>
      </header>

      <div className="flex flex-col gap-5">
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-semibold text-foreground">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={`${s.heading}-${i}`} className="mt-1 text-sm text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">
        {content.note}
      </p>

      <footer className="mt-auto flex flex-col gap-2 pt-4 text-sm text-muted">
        <Link href={otherHref} className="underline">
          {otherLabel}
        </Link>
        <p className="flex items-center gap-1.5 text-xs">
          <span className="font-display font-semibold text-foreground">
            Faro
          </span>
          <span aria-hidden>·</span>
          <span>by Abby Systems</span>
        </p>
      </footer>
    </main>
  );
}
