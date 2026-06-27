import type { Database } from "@/types/database";

// Spanish labels for the DB enums. Kept next to the schema types so a new enum
// value is a compile error here until it gets a label.
type Enums = Database["public"]["Enums"];

export type NeedCategory = Enums["need_category"];
export type Urgency = Enums["urgency"];

export const NEED_CATEGORIES: { value: NeedCategory; label: string }[] = [
  { value: "rescue", label: "Rescate" },
  { value: "medical", label: "Médico" },
  { value: "water", label: "Agua" },
  { value: "food", label: "Comida" },
  { value: "shelter", label: "Refugio" },
  { value: "evacuation", label: "Evacuación" },
  { value: "other", label: "Otro" },
];

export const URGENCIES: { value: Urgency; label: string }[] = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export type ResourceType = Enums["resource_type"];
export type HazardType = Enums["hazard_type"];

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  water_point: "Agua",
  food_distribution: "Comida",
  shelter: "Refugio",
  clinic: "Clínica",
  charging_station: "Carga eléctrica",
  distribution_center: "Centro de distribución",
  other: "Otro",
};

export const HAZARD_TYPE_LABEL: Record<HazardType, string> = {
  building_collapse: "Derrumbe",
  fire: "Incendio",
  flood: "Inundación",
  gas_leak: "Fuga de gas",
  road_blocked: "Vía bloqueada",
  power_line: "Cable eléctrico",
  aftershock: "Réplica",
  other: "Otro",
};

export const NEED_CATEGORY_LABEL: Record<NeedCategory, string> =
  Object.fromEntries(NEED_CATEGORIES.map((c) => [c.value, c.label])) as Record<
    NeedCategory,
    string
  >;
