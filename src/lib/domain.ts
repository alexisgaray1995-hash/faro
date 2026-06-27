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
