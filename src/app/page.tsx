import { Brand } from "@/components/ui/Brand";
import { RoleButton } from "@/components/ui/RoleButton";
import { SyncStatus } from "@/components/ui/SyncStatus";
import { ROLES } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 py-8">
      <header className="flex items-center justify-between">
        <Brand />
        <SyncStatus />
      </header>

      <div>
        <h1 className="text-balance text-3xl font-bold leading-tight text-foreground">
          ¿Qué necesitas?
        </h1>
        <p className="mt-2 text-muted">
          Pedir ayuda es anónimo y funciona sin internet. Tu ubicación se toma
          con el GPS del teléfono.
        </p>
      </div>

      <nav aria-label="Elige una opción" className="flex flex-col gap-4">
        {ROLES.map((entry) => (
          <RoleButton key={entry.role} entry={entry} />
        ))}
      </nav>

      <footer className="mt-auto text-sm text-muted">
        <p>
          Faro es una herramienta gratuita y de código abierto. Sin anuncios,
          sin rastreo.
        </p>
      </footer>
    </main>
  );
}
