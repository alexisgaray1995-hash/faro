import type { Metadata } from "next";
import Link from "next/link";

import { Mfa } from "@/components/auth/Mfa";

export const metadata: Metadata = { title: "Seguridad de la cuenta" };

export default function SeguridadPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <Link
        href="/coordinador"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <span aria-hidden>←</span> Coordinación
      </Link>

      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Seguridad
        </h1>
        <p className="mt-1 text-muted">
          Protege tu cuenta de coordinación con verificación en dos pasos.
        </p>
      </header>

      <Mfa />
    </main>
  );
}
