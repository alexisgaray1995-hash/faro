"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  HAZARD_TYPE_LABEL,
  NEED_CATEGORY_LABEL,
  RESOURCE_TYPE_LABEL,
} from "@/lib/domain";
import {
  HAZARD_TYPE_EN,
  NEED_CATEGORY_EN,
  RESOURCE_TYPE_EN,
  VERIFICATION_EN,
  type Dict,
  type Locale,
} from "@/lib/i18n";
import {
  fetchHazards,
  fetchNeeds,
  fetchResources,
  type Fetched,
  type PublicHazard,
  type PublicNeed,
  type PublicResource,
} from "@/lib/data/publicData";
import { timeAgo, VERIFICATION_LABEL } from "@/lib/format";
import { SupplyChips } from "@/components/find/SupplyChips";
import type { SupplyLine } from "@/lib/supply";

type Tab = "resources" | "hazards" | "needs";

type AnyRow = PublicResource | PublicHazard | PublicNeed;

function VerifiedBadge({
  v,
  locale,
}: {
  v: AnyRow["verification"];
  locale: Locale;
}) {
  const cls =
    v === "verified"
      ? "bg-volunteer/20 text-volunteer"
      : v === "disputed"
        ? "bg-help/20 text-help"
        : "bg-muted/20 text-muted";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {locale === "en" ? VERIFICATION_EN[v] : VERIFICATION_LABEL[v]}
    </span>
  );
}

// A responder-only management action on a card (resolve a need/hazard, delete a
// resource). Absent for anonymous citizens — they get the read-only card. RLS is
// the real guard; this just hides controls that would no-op for them anyway.
type Manage = {
  label: string;
  pendingLabel: string;
  confirm: string;
  failText: string;
  destructive?: boolean;
  run: () => Promise<boolean>;
  onDone: () => void;
};

function ManageButton({ manage }: { manage: Manage }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handle() {
    if (!confirm(manage.confirm)) return;
    setBusy(true);
    setFailed(false);
    const ok = await manage.run();
    if (ok) {
      manage.onDone();
      return; // card unmounts; no need to reset state
    }
    setFailed(true);
    setBusy(false);
  }

  const tone = manage.destructive
    ? "border-help text-help"
    : "border-volunteer text-volunteer";
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`min-h-[44px] rounded-xl border px-4 text-sm font-medium disabled:opacity-60 ${tone}`}
      >
        {busy ? manage.pendingLabel : manage.label}
      </button>
      {failed && <p className="mt-1 text-xs text-help">{manage.failText}</p>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  when,
  verification,
  lat,
  lng,
  locale,
  mapLabel,
  supplies,
  manage,
}: {
  title: string;
  subtitle?: string | null;
  when: string;
  verification: AnyRow["verification"];
  lat: number;
  lng: number;
  locale: Locale;
  mapLabel: string;
  supplies?: SupplyLine[] | null;
  manage?: Manage;
}) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <VerifiedBadge v={verification} locale={locale} />
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{timeAgo(when)}</span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {mapLabel}
        </a>
      </div>
      {supplies && <SupplyChips supplies={supplies} />}
      {manage && <ManageButton manage={manage} />}
    </li>
  );
}

export function FindHelp({ t, locale }: { t: Dict["find"]; locale: Locale }) {
  const TABS: { id: Tab; label: string }[] = [
    { id: "resources", label: t.tabs.resources },
    { id: "hazards", label: t.tabs.hazards },
    { id: "needs", label: t.tabs.needs },
  ];
  const resType = (k: PublicResource["type"]) =>
    locale === "en" ? RESOURCE_TYPE_EN[k] : RESOURCE_TYPE_LABEL[k];
  const hazType = (k: PublicHazard["type"]) =>
    locale === "en" ? HAZARD_TYPE_EN[k] : HAZARD_TYPE_LABEL[k];
  const needCat = (k: PublicNeed["category"]) =>
    locale === "en" ? NEED_CATEGORY_EN[k] : NEED_CATEGORY_LABEL[k];

  // Each tab's "add" action routes to that type's existing authoring page —
  // resources are responder-gated (/recursos), hazards and needs are open to
  // anyone in distress. No forms are duplicated onto this public view.
  const ADD: Record<Tab, { href: string; es: string; en: string }> = {
    resources: { href: "/recursos", es: "Agregar punto", en: "Add point" },
    hazards: { href: "/peligro", es: "Reportar peligro", en: "Report hazard" },
    needs: { href: "/sos", es: "Pedir ayuda", en: "Request help" },
  };

  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("resources");
  // ponytail: loading is derived from res.tab !== tab so the effect never
  // setState's synchronously (react-hooks/set-state-in-effect).
  const [res, setRes] = useState<{
    tab: Tab;
    error: boolean;
    data: Fetched<AnyRow> | null;
  }>({ tab, error: false, data: null });

  // A logged-in user here is a responder (only responders authenticate). Show
  // them inline resolve/delete controls; anonymous citizens stay read-only. RLS
  // enforces the real permission — this only hides buttons that would no-op.
  const [isResponder, setIsResponder] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data }) => active && setIsResponder(!!data.user));
    return () => {
      active = false;
    };
  }, [supabase]);

  // Optimistically drop a card once its resolve/delete succeeds — the row has
  // left the public view (resolved/expired/deleted), so a refetch would only
  // confirm the removal.
  function removeRow(id: string) {
    setRes((r) =>
      r.data
        ? { ...r, data: { ...r.data, rows: r.data.rows.filter((x) => x.id !== id) } }
        : r,
    );
  }
  const resolveRow = (table: "needs" | "hazards", id: string) => async () => {
    const { error } = await supabase
      .from(table)
      .update({ status: "resolved" })
      .eq("id", id);
    return !error;
  };
  const deleteResource = (id: string) => async () => {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    return !error;
  };
  const resolveLabels =
    locale === "en"
      ? { label: "Mark resolved", pendingLabel: "Resolving…", confirm: "Mark as resolved?", failText: "Couldn't update · retry" }
      : { label: "Marcar resuelto", pendingLabel: "Resolviendo…", confirm: "¿Marcar como resuelto?", failText: "No se pudo · reintenta" };
  const deleteLabels =
    locale === "en"
      ? { label: "Delete", pendingLabel: "Deleting…", confirm: "Delete this point?", failText: "Couldn't delete · retry" }
      : { label: "Eliminar", pendingLabel: "Eliminando…", confirm: "¿Eliminar este punto?", failText: "No se pudo · reintenta" };

  useEffect(() => {
    let active = true;
    const fetcher =
      tab === "resources"
        ? fetchResources
        : tab === "hazards"
          ? fetchHazards
          : fetchNeeds;
    fetcher()
      .then((data) => active && setRes({ tab, error: false, data }))
      .catch(() => active && setRes({ tab, error: true, data: null }));
    return () => {
      active = false;
    };
  }, [tab]);

  const current = res.tab === tab;
  const loading = !current || (!res.error && res.data === null);
  const state = {
    loading,
    error: current && res.error,
    data: current ? res.data : null,
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-[44px] flex-1 rounded-xl border px-3 font-medium ${
              tab === item.id
                ? "border-beacon bg-beacon/15 text-foreground"
                : "border-border bg-surface text-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Link
        href={ADD[tab].href}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-volunteer px-4 font-semibold text-white"
      >
        + {locale === "en" ? ADD[tab].en : ADD[tab].es}
      </Link>

      {state.data?.stale && (
        <p className="rounded-lg bg-beacon/15 px-3 py-2 text-sm text-foreground">
          {t.stale}
        </p>
      )}

      {state.loading && <p className="text-muted">{t.loading}</p>}

      {state.error && <p className="text-muted">{t.error}</p>}

      {state.data && state.data.rows.length === 0 && (
        <p className="text-muted">{t.empty}</p>
      )}

      {state.data && state.data.rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {tab === "resources" &&
            (state.data.rows as PublicResource[]).map((r) => (
              <Card
                key={r.id}
                title={`${resType(r.type)} · ${r.name}`}
                subtitle={
                  r.is_open
                    ? r.description
                    : `${t.closed} · ${r.description ?? ""}`
                }
                when={r.updated_at}
                verification={r.verification}
                lat={r.lat}
                lng={r.lng}
                locale={locale}
                mapLabel={t.viewMap}
                supplies={r.supplies}
                manage={
                  isResponder
                    ? {
                        ...deleteLabels,
                        destructive: true,
                        run: deleteResource(r.id),
                        onDone: () => removeRow(r.id),
                      }
                    : undefined
                }
              />
            ))}
          {tab === "hazards" &&
            (state.data.rows as PublicHazard[]).map((h) => (
              <Card
                key={h.id}
                title={hazType(h.type)}
                subtitle={h.description}
                when={h.updated_at}
                verification={h.verification}
                lat={h.lat}
                lng={h.lng}
                locale={locale}
                mapLabel={t.viewMap}
                manage={
                  isResponder
                    ? {
                        ...resolveLabels,
                        run: resolveRow("hazards", h.id),
                        onDone: () => removeRow(h.id),
                      }
                    : undefined
                }
              />
            ))}
          {tab === "needs" &&
            (state.data.rows as PublicNeed[]).map((n) => (
              <Card
                key={n.id}
                title={`${needCat(n.category)} · ${n.people_count} pers.`}
                subtitle={n.description}
                when={n.created_at}
                verification={n.verification}
                lat={n.lat}
                lng={n.lng}
                locale={locale}
                mapLabel={t.viewMap}
                manage={
                  isResponder
                    ? {
                        ...resolveLabels,
                        run: resolveRow("needs", n.id),
                        onDone: () => removeRow(n.id),
                      }
                    : undefined
                }
              />
            ))}
        </ul>
      )}
    </div>
  );
}
