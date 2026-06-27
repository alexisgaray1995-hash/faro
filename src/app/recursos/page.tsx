import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { LiveResources } from "@/components/recursos/LiveResources";
import { RecursosEditor } from "@/components/recursos/RecursosEditor";
import {
  ResourcePoints,
  type ResourceWithSupplies,
} from "@/components/recursos/ResourcePoints";

export const metadata: Metadata = { title: "Recursos y suministros" };

export default async function RecursosPage() {
  const supabase = await createClient();

  // Login is enforced by proxy.ts; this confirms the user is a responder.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .single();
  if (!user || !me) redirect("/acceso?next=/recursos");

  const { data } = await supabase
    .from("resources")
    .select("*, resource_supplies(*)")
    .order("updated_at", { ascending: false })
    .limit(200);
  const points = (data ?? []) as ResourceWithSupplies[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <LiveResources />
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> Inicio
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted underline">
            Salir
          </button>
        </form>
      </div>

      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Recursos y suministros
        </h1>
        <p className="mt-1 text-muted">
          Agrega puntos de ayuda y mantén su suministro al día. Agregar funciona
          sin conexión; editar un punto existente necesita internet.
        </p>
      </header>

      <RecursosEditor userId={user.id} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Puntos publicados</h2>
        <ResourcePoints points={points} userId={user.id} />
      </section>
    </main>
  );
}
