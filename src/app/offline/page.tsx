import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/ui/Brand";

export const metadata: Metadata = { title: "Sin conexión" };

// Served by the service worker when a page isn't cached and there's no network.
export default function OfflinePage() {
  return (
    <main className="beacon-aura mx-auto flex min-h-dvh w-full max-w-md flex-col items-start gap-6 px-5 py-8">
      <Brand />
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Estás sin conexión
        </h1>
        <p className="mt-3 text-muted">
          No hay internet ahora mismo. Las partes ya abiertas de Faro siguen
          funcionando, y lo que registres se guardará y se enviará solo cuando
          vuelva la señal.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-[48px] items-center rounded-xl bg-coordinator px-5 font-semibold text-white"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
