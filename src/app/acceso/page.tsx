import type { Metadata } from "next";
import Link from "next/link";

import { signIn } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Acceso para equipos" };

export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <span aria-hidden>←</span> Inicio
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Acceso para equipos
        </h1>
        <p className="mt-1 text-muted">
          Solo para voluntarios y coordinadores. Si necesitas ayuda, no hace
          falta cuenta:{" "}
          <Link href="/sos" className="underline">
            pedir ayuda
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
            Correo o contraseña incorrectos. Intenta de nuevo.
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Correo
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="min-h-[52px] rounded-xl border border-border bg-surface px-3 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Contraseña
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
          Entrar
        </button>
      </form>
    </main>
  );
}
