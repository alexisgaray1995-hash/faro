import type { SupabaseClient } from "@supabase/supabase-js";

import { db, type OutboxItem, type OutboxTable } from "@/lib/db/db";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// Queue a write locally. Returns the client_token so the UI can show "pending".
// Generates a token if the caller didn't supply one — it's the idempotency key.
export async function enqueue(
  table: OutboxTable,
  payload: Record<string, unknown>,
): Promise<string> {
  const client_token = (payload.client_token as string) ?? crypto.randomUUID();
  await db.outbox.add({
    table,
    payload: { ...payload, client_token },
    createdAt: Date.now(),
  });
  return client_token;
}

// Push queued writes to Supabase oldest-first. A duplicate client_token (unique
// violation, 23505) means a previous attempt already landed — treat as success.
// Any other error (offline, server) stops the run; the item stays queued for the
// next online event.
// ponytail: head-of-line stop, no backoff. Add per-item retry/backoff if one bad
// row ever needs to not block the rest.
export async function flush(supabase: Client): Promise<number> {
  // Only bail when the browser explicitly reports offline. navigator.onLine is
  // undefined outside browsers (e.g. tests), which we treat as online.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;

  const items = await db.outbox.orderBy("createdAt").toArray();
  let synced = 0;

  for (const item of items) {
    const { error } = await supabase
      .from(item.table)
      .insert(item.payload as never);

    if (error && error.code !== "23505") break;
    await db.outbox.delete(item.id as number);
    synced++;
  }

  return synced;
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}

// Wire auto-sync: flush now and whenever connectivity returns. Returns a cleanup.
export function startSync(supabase: Client): () => void {
  const run = () => {
    void flush(supabase).catch(() => {});
  };
  run();
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}

export type { OutboxItem };
