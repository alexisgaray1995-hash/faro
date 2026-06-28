"use client";

import {
  SUPPLY_CATEGORIES,
  SUPPLY_CATEGORY_LABEL,
  SUPPLY_STATUS_EMOJI,
  type SupplyCategory,
  type SupplyDraft,
  type SupplyStatus,
} from "@/lib/supply";

export type SupplyMap = Partial<Record<SupplyCategory, SupplyDraft>>;

const STATUS_CYCLE: SupplyStatus[] = ["ok", "low", "out"];

export function SupplyEditor({
  value,
  onChange,
}: {
  value: SupplyMap;
  onChange: (v: SupplyMap) => void;
}) {
  const added = SUPPLY_CATEGORIES.filter((c) => value[c]);
  const available = SUPPLY_CATEGORIES.filter((c) => !value[c]);

  function setRow(c: SupplyCategory, patch: Partial<SupplyDraft>) {
    onChange({ ...value, [c]: { ...(value[c] as SupplyDraft), ...patch } });
  }
  function cycle(c: SupplyCategory) {
    const cur = value[c]!.status;
    const next =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    setRow(c, { status: next });
  }
  function add(c: SupplyCategory) {
    onChange({ ...value, [c]: { status: "ok", quantity: "", unit: "" } });
  }
  function remove(c: SupplyCategory) {
    const next = { ...value };
    delete next[c];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {added.map((c) => (
        <div key={c} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cycle(c)}
            aria-label={`Estado de ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] min-w-[44px] text-xl"
          >
            {SUPPLY_STATUS_EMOJI[value[c]!.status]}
          </button>
          <span className="flex-1 text-foreground">
            {SUPPLY_CATEGORY_LABEL[c]}
          </span>
          <input
            inputMode="numeric"
            value={value[c]!.quantity}
            onChange={(e) => setRow(c, { quantity: e.target.value })}
            placeholder="cant."
            aria-label={`Cantidad de ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] w-16 rounded-xl border border-border bg-surface px-2 text-foreground"
          />
          <input
            value={value[c]!.unit}
            onChange={(e) => setRow(c, { unit: e.target.value })}
            maxLength={20}
            placeholder="ud."
            aria-label={`Unidad de ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] w-16 rounded-xl border border-border bg-surface px-2 text-foreground"
          />
          <button
            type="button"
            onClick={() => remove(c)}
            aria-label={`Quitar ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] px-2 text-muted"
          >
            ✕
          </button>
        </div>
      ))}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => add(e.target.value as SupplyCategory)}
          aria-label="Agregar suministro"
          className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
        >
          <option value="" disabled>
            Agregar suministro…
          </option>
          {available.map((c) => (
            <option key={c} value={c}>
              {SUPPLY_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
