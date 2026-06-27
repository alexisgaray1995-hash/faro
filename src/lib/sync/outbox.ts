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

// After this many failed flushes, a row is dead-lettered (failed=true) so a
// server that keeps 500ing on one payload can't wedge the queue indefinitely.
const MAX_ATTEMPTS = 5;

// A Postgres data/integrity/access error (SQLSTATE class 22/23/42) means the
// payload itself is bad — retrying will never fix it. Network/5xx/offline errors
// have no such code and are transient. (23505, the idempotent duplicate, is
// handled as success before we ever ask this.)
function isPermanent(code: string | undefined): boolean {
  return code !== undefined && /^(22|23|42)/.test(code);
}

// Push queued writes to Supabase oldest-first. A duplicate client_token (unique
// violation, 23505) means a previous attempt already landed — treat as success.
// A permanent rejection (bad payload) is dead-lettered and SKIPPED so it can't
// block the people queued behind it. A transient error (offline, server) stops
// the run; those items wait for the next online event.
// ponytail: dead-lettered rows stay in the table (not re-sent) but aren't
// surfaced to the user yet — add a "couldn't send" review screen if that matters.
export async function flush(supabase: Client): Promise<number> {
  // Only bail when the browser explicitly reports offline. navigator.onLine is
  // undefined outside browsers (e.g. tests), which we treat as online.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;

  const items = (await db.outbox.orderBy("createdAt").toArray()).filter(
    (i) => !i.failed,
  );
  let synced = 0;

  for (const item of items) {
    const { error } = await supabase
      .from(item.table)
      .insert(item.payload as never);

    if (!error || error.code === "23505") {
      await db.outbox.delete(item.id as number);
      synced++;
      continue;
    }

    const attempts = (item.attempts ?? 0) + 1;
    if (isPermanent(error.code) || attempts >= MAX_ATTEMPTS) {
      // Poison row: park it so the rest of the queue can still drain.
      await db.outbox.update(item.id as number, { attempts, failed: true });
      continue;
    }

    // Transient: remember the attempt and stop — likely the network is down.
    await db.outbox.update(item.id as number, { attempts });
    break;
  }

  return synced;
}

// Items still expected to sync (excludes dead-lettered ones).
export async function pendingCount(): Promise<number> {
  return db.outbox.filter((i) => !i.failed).count();
}

// Rows the server kept rejecting — a cry for help that needs human attention.
export async function failedCount(): Promise<number> {
  return db.outbox.filter((i) => i.failed === true).count();
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
