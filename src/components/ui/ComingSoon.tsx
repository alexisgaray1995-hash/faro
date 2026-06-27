import Link from "next/link";

// Honest placeholder for routes delivered in later milestones — clearly says
// "not ready yet" rather than showing fake data (Golden Rule #5 / DO NOT list).
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <span aria-hidden>←</span> Volver al inicio
      </Link>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-muted">{description}</p>
        <p className="mt-4 inline-block rounded-full bg-beacon/15 px-3 py-1 text-sm font-medium text-foreground">
          Disponible próximamente
        </p>
      </div>
    </main>
  );
}
