"use client";

import { useEffect, useState } from "react";

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

function Card({
  title,
  subtitle,
  when,
  verification,
  lat,
  lng,
  locale,
  mapLabel,
}: {
  title: string;
  subtitle?: string | null;
  when: string;
  verification: AnyRow["verification"];
  lat: number;
  lng: number;
  locale: Locale;
  mapLabel: string;
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

  const [tab, setTab] = useState<Tab>("resources");
  // ponytail: loading is derived from res.tab !== tab so the effect never
  // setState's synchronously (react-hooks/set-state-in-effect).
  const [res, setRes] = useState<{
    tab: Tab;
    error: boolean;
    data: Fetched<AnyRow> | null;
  }>({ tab, error: false, data: null });

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
              />
            ))}
        </ul>
      )}
    </div>
  );
}
