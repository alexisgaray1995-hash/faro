import { db } from "@/lib/db/db";
import type {
  HazardType,
  NeedCategory,
  ResourceType,
  Urgency,
} from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import type { SupplyLine } from "@/lib/supply";
import type { Database } from "@/types/database";

type Verification = Database["public"]["Enums"]["verification_status"];

// The generated view types mark every column nullable, but these all come from
// NOT NULL base columns, so we narrow to the non-null shape the UI relies on.
export interface PublicResource {
  id: string;
  type: ResourceType;
  name: string;
  description: string | null;
  is_open: boolean;
  lat: number;
  lng: number;
  verification: Verification;
  updated_at: string;
  supplies: SupplyLine[] | null;
}

export interface PublicHazard {
  id: string;
  type: HazardType;
  severity: Urgency;
  description: string | null;
  lat: number;
  lng: number;
  verification: Verification;
  updated_at: string;
}

export interface PublicNeed {
  id: string;
  category: NeedCategory;
  people_count: number;
  description: string | null;
  lat: number;
  lng: number;
  verification: Verification;
  created_at: string;
}

type ViewName = "public_resources" | "public_hazards" | "public_needs";

export type Fetched<T> = { rows: T[]; fetchedAt: number; stale: boolean };

// Read a public view: serve cache instantly, then try the network and refresh
// the cache. If the network fails (offline), return cache marked stale so the UI
// can show "datos guardados — pueden estar desactualizados".
async function read<T>(view: ViewName, order: string): Promise<Fetched<T>> {
  const cached = await db.cache.get(view);
  try {
    const { data, error } = await createClient()
      .from(view)
      .select("*")
      .order(order, { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as unknown as T[];
    const fetchedAt = Date.now();
    await db.cache.put({ key: view, rows, fetchedAt });
    return { rows, fetchedAt, stale: false };
  } catch {
    if (cached) {
      return {
        rows: cached.rows as T[],
        fetchedAt: cached.fetchedAt,
        stale: true,
      };
    }
    throw new Error("offline-no-cache");
  }
}

export const fetchResources = () =>
  read<PublicResource>("public_resources", "updated_at");
export const fetchHazards = () =>
  read<PublicHazard>("public_hazards", "updated_at");
export const fetchNeeds = () => read<PublicNeed>("public_needs", "created_at");
