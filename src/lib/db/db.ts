import Dexie, { type Table } from "dexie";

// Tables an anonymous citizen can write to while offline. Each maps to a
// Supabase table with a client_token for idempotent replay.
export type OutboxTable = "needs" | "hazards" | "missing_persons";

export interface OutboxItem {
  id?: number;
  table: OutboxTable;
  // The row to insert. Always carries client_token so retries don't duplicate.
  payload: Record<string, unknown> & { client_token: string };
  createdAt: number;
}

// Local IndexedDB. For now it's just the offline write queue; cached reads
// (resources/hazards for the map) get added when the map lands.
// ponytail: one table until reads need caching.
class FaroDB extends Dexie {
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super("faro");
    this.version(1).stores({ outbox: "++id, createdAt" });
  }
}

export const db = new FaroDB();
