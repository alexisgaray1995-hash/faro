import type { Database } from "@/types/database";

export type SupplyCategory = Database["public"]["Enums"]["supply_category"];
export type SupplyStatus = Database["public"]["Enums"]["supply_status"];

// Spanish labels — a new enum value is a compile error here until it gets one.
export const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  water: "Agua",
  food: "Comida",
  medical: "Médico",
  shelter_beds: "Camas",
  hygiene: "Higiene",
  power: "Energía",
  infant: "Bebés",
  other: "Otro",
};

export const SUPPLY_STATUS_LABEL: Record<SupplyStatus, string> = {
  ok: "Disponible",
  low: "Poco",
  out: "Agotado",
};

export const SUPPLY_STATUS_EMOJI: Record<SupplyStatus, string> = {
  ok: "🟢",
  low: "🟡",
  out: "🔴",
};

// Stable ordering for editor rows and chips.
export const SUPPLY_CATEGORIES: SupplyCategory[] = [
  "water",
  "food",
  "medical",
  "shelter_beds",
  "hygiene",
  "power",
  "infant",
  "other",
];

// Only the absence of these is life-threatening enough to turn a pin red.
const CRITICAL: SupplyCategory[] = ["water", "food", "medical"];

export type PinStatus = "critical" | "low" | "ok" | "closed" | "neutral";

export interface SupplyLine {
  category: SupplyCategory;
  status: SupplyStatus;
  quantity?: number | null;
  unit?: string | null;
  label?: string | null;
}

// Worst-status → pin status. Closed wins (a closed point is not an active
// alarm); then a critical category being out (red); then anything low (amber);
// then stocked (green). No supply data at all is neutral — unknown is not "out".
export function pinStatus(
  supplies: SupplyLine[] | null | undefined,
  isOpen: boolean,
): PinStatus {
  if (!isOpen) return "closed";
  if (!supplies || supplies.length === 0) return "neutral";
  if (supplies.some((s) => s.status === "out" && CRITICAL.includes(s.category)))
    return "critical";
  if (supplies.some((s) => s.status === "low" || s.status === "out")) return "low";
  return "ok";
}

// Marker tints per pin status.
export const PIN_COLOR: Record<PinStatus, string> = {
  critical: "#dc2626",
  low: "#d97706",
  ok: "#16a34a",
  closed: "#9ca3af",
  neutral: "#6b7280",
};

// One chip's text: "Agua: Disponible" or "Agua: Poco · 200 L".
export function supplyLineText(s: SupplyLine): string {
  const base = `${SUPPLY_CATEGORY_LABEL[s.category]}: ${SUPPLY_STATUS_LABEL[s.status]}`;
  if (s.quantity == null) return base;
  return `${base} · ${s.quantity}${s.unit ? ` ${s.unit}` : ""}`;
}

// Editor draft shape (quantity/unit are raw input strings).
export interface SupplyDraft {
  status: SupplyStatus;
  quantity: string;
  unit: string;
}

export interface SupplyRowInput {
  category: SupplyCategory;
  status: SupplyStatus;
  quantity: number | null;
  unit: string | null;
}

// Convert editor drafts into DB-ready rows: blanks → null, numeric strings → number.
export function draftsToRows(
  value: Partial<Record<SupplyCategory, SupplyDraft>>,
): SupplyRowInput[] {
  return (Object.entries(value) as [SupplyCategory, SupplyDraft][]).map(
    ([category, d]) => ({
      category,
      status: d.status,
      quantity: d.quantity.trim() === "" ? null : Number(d.quantity),
      unit: d.unit.trim() === "" ? null : d.unit.trim(),
    }),
  );
}
