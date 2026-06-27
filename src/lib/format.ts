import type { Database } from "@/types/database";

// Spanish "hace X" relative time. Coarse on purpose — exact seconds don't matter
// for freshness, the point is "is this fresh or old".
export function timeAgo(iso: string, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "hace un momento";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

type Verification = Database["public"]["Enums"]["verification_status"];

export const VERIFICATION_LABEL: Record<Verification, string> = {
  verified: "Verificado",
  unverified: "Sin verificar",
  disputed: "En disputa",
};
