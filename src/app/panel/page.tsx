import type { Metadata } from "next";
import Link from "next/link";

import {
  claimNeed,
  releaseNeed,
  setAssignmentStatus,
  signOut,
  updateNeedStatus,
} from "@/lib/auth/actions";
import { LiveNeeds } from "@/components/panel/LiveNeeds";
import { RouteEta } from "@/components/panel/RouteEta";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNMENT_STATUS_LABEL,
  NEED_CATEGORY_LABEL,
  NEED_STATUS_LABEL,
  NEXT_ASSIGNMENT_STATUS,
  URGENCIES,
  type AssignmentStatus,
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

function ActionButton({
  id,
  action,
  label,
  primary,
}: {
  id: string;
  action: (formData: FormData) => void;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
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

// A need as joined onto an assignment row (responder may read full PII).
type AssignedNeed = Pick<
  Need,
  | "category"
  | "people_count"
  | "lat"
  | "lng"
  | "address_note"
  | "contact_name"
  | "contact_phone"
>;
type MyAssignment = {
  id: string;
  status: AssignmentStatus;
  note: string | null;
  needs: AssignedNeed | null;
};

// What a coordinator handed this responder, with the one forward action to keep
// the dispatcher's board live (Aceptar → En camino → Completar).
function AssignmentCard({ a }: { a: MyAssignment }) {
  const n = a.needs;
  if (!n) return null;
  const next = NEXT_ASSIGNMENT_STATUS[a.status];
  return (
    <li className="rounded-2xl border border-coordinator/40 bg-coordinator/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">
          {NEED_CATEGORY_LABEL[n.category]} · {n.people_count} pers.
        </h3>
        <span className="rounded-full bg-coordinator/20 px-2 py-0.5 text-xs font-medium text-foreground">
          {ASSIGNMENT_STATUS_LABEL[a.status]}
        </span>
      </div>

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
      {a.note && <p className="mt-1 text-sm text-muted">📝 {a.note}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
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

      {next && (
        <form action={setAssignmentStatus} className="mt-3">
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="status" value={next} />
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-coordinator px-4 font-medium text-white"
          >
            {ASSIGNMENT_STATUS_LABEL[next]}
          </button>
        </form>
      )}
    </li>
  );
}

function NeedCard({ n, mine }: { n: Need; mine: boolean }) {
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
        {mine && (
          <span className="font-medium text-volunteer">Tomado por ti</span>
        )}
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
        {!n.claimed_by && (
          <ActionButton id={n.id} action={claimNeed} label="Tomar" primary />
        )}
        {mine && (
          <>
            <StatusButton
              id={n.id}
              status="resolved"
              label="Marcar resuelto"
              primary
            />
            <ActionButton id={n.id} action={releaseNeed} label="Liberar" />
          </>
        )}
      </div>
    </li>
  );
}

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Show what's available (unclaimed) plus what's mine — hide needs another
  // responder already grabbed so two people don't work the same person.
  const query = supabase
    .from("needs")
    .select("*")
    .in("status", ["open", "in_progress"]);
  if (user) query.or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

  // My open assignments (what a coordinator dispatched to me), newest first.
  // RLS already limits this to my own rows; completed/cancelled drop off.
  const asgQuery = user
    ? supabase
        .from("assignments")
        .select(
          "id, status, note, needs(category, people_count, lat, lng, address_note, contact_name, contact_phone)",
        )
        .eq("responder_id", user.id)
        .not("status", "in", "(completed,cancelled)")
        .order("created_at", { ascending: false })
    : null;

  const [{ data, error }, asgRes] = await Promise.all([
    query
      .order("urgency")
      .order("created_at", { ascending: false })
      .limit(200),
    asgQuery ?? Promise.resolve({ data: [] }),
  ]);

  const needs = (data ?? []) as Need[];
  const assignments = (asgRes.data ?? []) as unknown as MyAssignment[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <LiveNeeds />
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> Inicio
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/recursos" className="text-sm text-muted underline">
            Recursos
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted underline">
              Salir
            </button>
          </form>
        </div>
      </div>

      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Pedidos de ayuda
        </h1>
        <p className="mt-1 text-muted">
          Abiertos y en proceso, los más urgentes primero. Verifica los datos
          antes de actuar.
        </p>
      </header>

      <p className="rounded-xl border border-help/40 bg-help/10 px-3 py-2 text-xs text-muted">
        Actúa según tu criterio y formación. No te pongas en peligro y sigue las
        indicaciones de las autoridades. La información la reporta la comunidad y
        puede ser inexacta.
      </p>

      {assignments.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Mis asignaciones
          </h2>
          <p className="mt-1 text-sm text-muted">
            Lo que coordinación te encargó. Marca tu avance para que lo vean en
            tiempo real.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}

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
            <NeedCard key={n.id} n={n} mine={n.claimed_by === user?.id} />
          ))}
        </ul>
      )}
    </main>
  );
}
