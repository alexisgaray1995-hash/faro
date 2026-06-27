import type { Metadata } from "next";
import Link from "next/link";

import {
  assignNeed,
  setResponderActive,
  setResponderRole,
  signOut,
  verifyNeed,
} from "@/lib/auth/actions";
import { LiveNeeds } from "@/components/panel/LiveNeeds";
import { triageNeeds, type Triage } from "@/lib/ai/triage";
import { createClient } from "@/lib/supabase/server";
import {
  NEED_CATEGORY_LABEL,
  NEED_STATUS_LABEL,
  URGENCIES,
} from "@/lib/domain";
import { timeAgo, VERIFICATION_LABEL } from "@/lib/format";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Panel de coordinación" };

type Need = Database["public"]["Tables"]["needs"]["Row"];
type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "role" | "is_active" | "organization"
>;
type Assignment = Pick<
  Database["public"]["Tables"]["assignments"]["Row"],
  "need_id" | "responder_id"
>;

const URGENCY_LABEL = Object.fromEntries(
  URGENCIES.map((u) => [u.value, u.label]),
) as Record<Need["urgency"], string>;

function VerifyButton({
  id,
  verification,
  label,
}: {
  id: string;
  verification: "verified" | "disputed" | "unverified";
  label: string;
}) {
  return (
    <form action={verifyNeed}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="verification" value={verification} />
      <button
        type="submit"
        className="min-h-[44px] rounded-xl border border-border bg-surface px-4 font-medium text-foreground"
      >
        {label}
      </button>
    </form>
  );
}

function NeedCard({
  n,
  responders,
  assignedNames,
  suggestion,
}: {
  n: Need;
  responders: Profile[];
  assignedNames: string[];
  suggestion?: Triage;
}) {
  // Only surface the AI when it disagrees with what the citizen selected — a
  // possible mis-category or under-triage worth a human second look.
  const differs =
    suggestion &&
    (suggestion.category !== n.category || suggestion.urgency !== n.urgency);
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

      {differs && suggestion && (
        <div className="mt-2 rounded-xl border border-beacon/40 bg-beacon/10 p-2 text-xs text-foreground">
          <span className="font-semibold">Sugerencia IA — verificar:</span>{" "}
          {NEED_CATEGORY_LABEL[suggestion.category]} ·{" "}
          {URGENCY_LABEL[suggestion.urgency]}
          {suggestion.rationale && (
            <span className="text-muted"> — {suggestion.rationale}</span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{timeAgo(n.created_at)}</span>
        <span className="font-medium text-foreground">
          {VERIFICATION_LABEL[n.verification]}
        </span>
        <span>{NEED_STATUS_LABEL[n.status]}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {n.verification !== "verified" && (
          <VerifyButton id={n.id} verification="verified" label="Verificar" />
        )}
        {n.verification !== "disputed" && (
          <VerifyButton
            id={n.id}
            verification="disputed"
            label="Marcar dudoso"
          />
        )}
      </div>

      {assignedNames.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Asignado a: {assignedNames.join(", ")}
        </p>
      )}

      {responders.length > 0 && (
        <form action={assignNeed} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="need_id" value={n.id} />
          <select
            name="responder_id"
            required
            defaultValue=""
            aria-label="Asignar a"
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface px-3 text-foreground"
          >
            <option value="" disabled>
              Asignar a…
            </option>
            {responders.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-coordinator px-4 font-medium text-white"
          >
            Asignar
          </button>
        </form>
      )}
    </li>
  );
}

// The responder registry: a coordinator sees the whole roster and manages it —
// promote a trusted volunteer to coordinator, or deactivate someone who's done.
// Self-row actions are hidden so a coordinator can't lock themselves out.
function RosterSection({ roster, meId }: { roster: Profile[]; meId: string }) {
  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold text-foreground">
        Equipo de respuesta ({roster.length})
      </summary>
      <p className="mt-1 text-sm text-muted">
        Promueve a coordinador a quien confíes; desactiva a quien ya no esté
        disponible.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {roster.map((r) => {
          const isMe = r.id === meId;
          const isCoordinator = r.role === "coordinator";
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {r.display_name}
                  {isMe && <span className="text-muted"> · tú</span>}
                </p>
                <p className="text-xs text-muted">
                  {isCoordinator ? "Coordinador" : "Voluntario"}
                  {r.organization && ` · ${r.organization}`}
                  {!r.is_active && " · inactivo"}
                </p>
              </div>
              {!isMe && (
                <div className="flex flex-wrap gap-2">
                  <form action={setResponderRole}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="role"
                      value={isCoordinator ? "volunteer" : "coordinator"}
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground"
                    >
                      {isCoordinator ? "Quitar coord." : "Hacer coord."}
                    </button>
                  </form>
                  <form action={setResponderActive}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={r.is_active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground"
                    >
                      {r.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default async function CoordinadorPage() {
  const supabase = await createClient();

  // Login is enforced by middleware; this enforces the coordinator role.
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .single();
  if (me?.role !== "coordinator") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
        <Link href="/" className="text-sm text-muted underline">
          ← Inicio
        </Link>
        <p className="text-muted">
          Esta sección es solo para coordinadores. Si eres voluntario, usa el{" "}
          <Link href="/panel" className="underline">
            panel de voluntario
          </Link>
          .
        </p>
      </main>
    );
  }

  const [{ data: needsData }, { data: rosterData }, { data: asgData }] =
    await Promise.all([
      supabase
        .from("needs")
        .select("*")
        .in("status", ["open", "in_progress"])
        .order("urgency")
        .order("created_at", { ascending: false })
        .limit(200),
      // The whole responder roster (incl. inactive) — drives the registry below;
      // active ones feed the assignment dropdown.
      supabase
        .from("profiles")
        .select("id, display_name, role, is_active, organization")
        .order("display_name"),
      supabase.from("assignments").select("need_id, responder_id"),
    ]);

  const needs = (needsData ?? []) as Need[];
  const roster = (rosterData ?? []) as Profile[];
  const responders = roster.filter((r) => r.is_active);
  const assignments = (asgData ?? []) as Assignment[];

  // No-ops to an empty map when Ollama isn't running, so the dashboard is
  // unaffected if no AI box is configured.
  const suggestions = await triageNeeds(needs);

  const nameById = new Map(responders.map((r) => [r.id, r.display_name]));
  const namesByNeed = new Map<string, string[]>();
  for (const a of assignments) {
    const name = nameById.get(a.responder_id);
    if (!name) continue;
    namesByNeed.set(a.need_id, [...(namesByNeed.get(a.need_id) ?? []), name]);
  }

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
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted underline">
            Salir
          </button>
        </form>
      </div>

      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Coordinación
        </h1>
        <p className="mt-1 text-muted">
          Verifica los pedidos y asigna equipos. Verificar es una acción
          consecuente: confirma los datos antes.
        </p>
      </header>

      {needs.length === 0 && (
        <p className="text-muted">No hay pedidos abiertos por ahora.</p>
      )}

      {needs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {needs.map((n) => (
            <NeedCard
              key={n.id}
              n={n}
              responders={responders}
              assignedNames={namesByNeed.get(n.id) ?? []}
              suggestion={suggestions.get(n.id)}
            />
          ))}
        </ul>
      )}

      {roster.length > 0 && <RosterSection roster={roster} meId={me.id} />}
    </main>
  );
}
