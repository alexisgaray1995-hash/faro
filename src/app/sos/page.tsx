import type { Metadata } from "next";
import Link from "next/link";

import { SosForm } from "@/components/sos/SosForm";
import { SyncStatus } from "@/components/ui/SyncStatus";

export const metadata: Metadata = { title: "Pedir ayuda" };

export default function SosPage() {
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
        <h1 className="text-2xl font-bold text-foreground">Pedir ayuda</h1>
        <p className="mt-1 text-muted">
          Sin cuenta y sin internet. Cuéntanos qué necesitas y dónde estás.
        </p>
      </header>
      <SosForm />
    </main>
  );
}
