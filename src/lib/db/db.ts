import Dexie, { type Table } from "dexie";

// Tables an anonymous citizen can write to while offline. Each maps to a
// Supabase table with a client_token for idempotent replay.
export type OutboxTable =
  | "needs"
  | "hazards"
  | "missing_persons"
  | "resources"
  | "resource_supplies";

export interface OutboxItem {
  id?: number;
  table: OutboxTable;
  // The row to insert. Server-PK tables (needs/hazards/missing_persons) carry a
  // client_token for idempotent replay; resources dedup on their own PK instead.
  payload: Record<string, unknown>;
  createdAt: number;
  // Replay bookkeeping. attempts counts failed flushes; failed marks a row the
  // server keeps rejecting (poison) so it's skipped instead of blocking the queue.
  attempts?: number;
  failed?: boolean;
}

// Cached public reads so the map/list still shows last-known help points when
// offline (Golden Rule #1). Keyed by view name.
export interface CacheEntry {
  key: string;
  rows: unknown[];
  fetchedAt: number;
}

// Local IndexedDB: the offline write queue plus a small read cache.
class FaroDB extends Dexie {
  outbox!: Table<OutboxItem, number>;
  cache!: Table<CacheEntry, string>;

  constructor() {
    super("faro");
    this.version(1).stores({ outbox: "++id, createdAt" });
    this.version(2).stores({ outbox: "++id, createdAt", cache: "key" });
  }
}

export const db = new FaroDB();
