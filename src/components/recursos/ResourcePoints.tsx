"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { RESOURCE_TYPE_LABEL } from "@/lib/domain";
import {
  allSuppliesOut,
  draftsToRows,
  type SupplyCategory,
} from "@/lib/supply";
import {
  SupplyEditor,
  type SupplyMap,
} from "@/components/recursos/SupplyEditor";
import type { Database } from "@/types/database";

type SupplyRow = Database["public"]["Tables"]["resource_supplies"]["Row"];
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type ResourceWithSupplies = ResourceRow & {
  resource_supplies: SupplyRow[];
};

// Seed the editor map from the point's current supply rows.
function toMap(rows: SupplyRow[]): SupplyMap {
  const m: SupplyMap = {};
  for (const r of rows) {
    m[r.category] = {
      status: r.status,
      quantity: r.quantity == null ? "" : String(r.quantity),
      unit: r.unit ?? "",
    };
  }
  return m;
}

function PointEditor({
  point,
  userId,
}: {
  point: ResourceWithSupplies;
  userId: string;
}) {
  const router = useRouter();
  const original = point.resource_supplies.map((s) => s.category);
  const [supplies, setSupplies] = useState<SupplyMap>(
    toMap(point.resource_supplies),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Offer deletion once every supply in the editor reads "out". Gated on the
  // live edit (not the saved rows) so the button appears the moment you mark the
  // point depleted — no save-then-refresh round-trip to discover it.
  const depleted = allSuppliesOut(draftsToRows(supplies));

  async function remove() {
    if (!confirm(`¿Eliminar "${point.name}"? Esta acción no se puede deshacer.`))
      return;
    setDeleting(true);
    setError(false);
    const supabase = createClient();
    const { error: delErr } = await supabase
      .from("resources")
      .delete()
      .eq("id", point.id);
    if (delErr) {
      setError(true);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setError(false);
    const supabase = createClient();
    const rows = draftsToRows(supplies);
    const present = new Set(rows.map((r) => r.category));
    const removed = original.filter(
      (c) => !present.has(c as SupplyCategory),
    ) as SupplyCategory[];

    try {
      if (rows.length > 0) {
        const { error: upErr } = await supabase
          .from("resource_supplies")
          .upsert(
            rows.map((r) => ({
              resource_id: point.id,
              category: r.category,
              status: r.status,
              quantity: r.quantity,
              unit: r.unit,
              updated_by: userId,
            })),
            { onConflict: "resource_id,category" },
          );
        if (upErr) throw upErr;
      }
      for (const c of removed) {
        const { error: delErr } = await supabase
          .from("resource_supplies")
          .delete()
          .eq("resource_id", point.id)
          .eq("category", c);
        if (delErr) throw delErr;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">
          {RESOURCE_TYPE_LABEL[point.type]} · {point.name}
        </h3>
        {!point.is_open && <span className="text-xs text-muted">Cerrado</span>}
      </div>
      <a
        href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-volunteer underline"
      >
        📍 Ver en mapa · cómo llegar
      </a>
      <div className="mt-3">
        <SupplyEditor value={supplies} onChange={setSupplies} />
      </div>
      {error && (
        <p className="mt-2 text-sm text-help">
          Necesitas conexión para guardar cambios en un punto existente.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || deleting}
          className="min-h-[44px] rounded-xl bg-volunteer px-4 font-medium text-white disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar suministros"}
        </button>
        {depleted && (
          <button
            type="button"
            onClick={remove}
            disabled={saving || deleting}
            className="min-h-[44px] rounded-xl border border-help px-4 font-medium text-help disabled:opacity-60"
          >
            {deleting ? "Eliminando…" : "Eliminar punto"}
          </button>
        )}
      </div>
    </li>
  );
}

export function ResourcePoints({
  points,
  userId,
}: {
  points: ResourceWithSupplies[];
  userId: string;
}) {
  if (points.length === 0) {
    return <p className="text-muted">Aún no hay puntos. Agrega el primero.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {points.map((p) => (
        <PointEditor key={p.id} point={p} userId={userId} />
      ))}
    </ul>
  );
}
