import type { Metadata } from "next";
import Link from "next/link";

import { signOut, updateNeedStatus } from "@/lib/auth/actions";
import { RouteEta } from "@/components/panel/RouteEta";
import { createClient } from "@/lib/supabase/server";
import {
  NEED_CATEGORY_LABEL,
  NEED_STATUS_LABEL,
  URGENCIES,
  type NeedStatus,
} from "@/lib/domain";
import { timeAgo, VERIFICATION_LABEL } from "@/lib/format";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Panel de voluntario" };

type Need = Database["public"]["Tables"]["needs"]["Row"];

const URGENCY_LABEL = Object.fromEntries(
  URGENCIES.map((u) => [u.value, u.label]),
) as Record<Need["urgency"], string>;

function StatusButton({
  id,
  status,
  label,
  primary,
}: {
  id: string;
  status: NeedStatus;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={updateNeedStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`min-h-[44px] rounded-xl px-4 font-medium ${
          primary
            ? "bg-volunteer text-white"
            : "border border-border bg-surface text-foreground"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function NeedCard({ n }: { n: Need }) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">
          {NEED_CATEGORY_LABEL[n.category]} · {n.people_count} pers.
        </h3>
        <span className="rounded-full bg-night/40 px-2 py-0.5 text-xs font-medium text-foreground">
          {URGENCY_LABEL[n.urgency]}
        </span>
      </div>

      {n.description && (
        <p className="mt-1 text-sm text-muted">{n.description}</p>
      )}
      {n.address_note && (
        <p className="mt-1 text-sm text-muted">📍 {n.address_note}</p>
      )}
      {n.contact_name && (
        <p className="mt-1 text-sm text-muted">
          {n.contact_name}
          {n.contact_phone && (
            <>
              {" · "}
              <a href={`tel:${n.contact_phone}`} className="underline">
                {n.contact_phone}
              </a>
            </>
          )}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{timeAgo(n.created_at)}</span>
        <span>{VERIFICATION_LABEL[n.verification]}</span>
        <span>{NEED_STATUS_LABEL[n.status]}</span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${n.lat}&mlon=${n.lng}#map=17/${n.lat}/${n.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Ver en mapa
        </a>
        <RouteEta lat={n.lat} lng={n.lng} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {n.status === "open" && (
          <StatusButton id={n.id} status="in_progress" label="Tomar" primary />
        )}
        {n.status === "in_progress" && (
          <>
            <StatusButton
              id={n.id}
              status="resolved"
              label="Marcar resuelto"
              primary
            />
            <StatusButton id={n.id} status="open" label="Liberar" />
          </>
        )}
      </div>
    </li>
  );
}

export default async function PanelPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("needs")
    .select("*")
    .in("status", ["open", "in_progress"])
    .order("urgency")
    .order("created_at", { ascending: false })
    .limit(200);

  const needs = (data ?? []) as Need[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
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
        <h1 className="text-2xl font-bold text-foreground">Pedidos de ayuda</h1>
        <p className="mt-1 text-muted">
          Abiertos y en proceso, los más urgentes primero. Verifica los datos
          antes de actuar.
        </p>
      </header>

      {error && (
        <p className="text-muted">
          No se pudieron cargar los pedidos. Revisa tu conexión.
        </p>
      )}

      {!error && needs.length === 0 && (
        <p className="text-muted">No hay pedidos abiertos por ahora.</p>
      )}

      {needs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {needs.map((n) => (
            <NeedCard key={n.id} n={n} />
          ))}
        </ul>
      )}
    </main>
  );
}
