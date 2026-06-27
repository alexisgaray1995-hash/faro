import type { Metadata } from "next";
import Link from "next/link";

import { FindHelp } from "@/components/find/FindHelp";
import { SyncStatus } from "@/components/ui/SyncStatus";

export const metadata: Metadata = { title: "Buscar ayuda y peligros" };

export default function MapaPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> Inicio
        </Link>
        <SyncStatus />
      </div>
      <header>
        <h1 className="text-2xl font-bold text-foreground">Buscar ayuda</h1>
        <p className="mt-1 text-muted">
          Agua, comida, refugios, clínicas y peligros reportados cerca.
        </p>
      </header>
      <FindHelp />

      <footer className="mt-auto pt-4 text-sm text-muted">
        <Link href="/panel" className="underline">
          Acceso para voluntarios y equipos
        </Link>
      </footer>
    </main>
  );
}
