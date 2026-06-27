import "fake-indexeddb/auto";
import { afterEach, expect, test, vi } from "vitest";

import { db } from "@/lib/db/db";

import { enqueue, failedCount, flush, pendingCount } from "./outbox";

afterEach(async () => {
  await db.outbox.clear();
  vi.restoreAllMocks();
});

// A minimal fake of the bits of the Supabase client flush() touches.
function fakeSupabase(error: { code: string } | null = null) {
  const inserted: unknown[] = [];
  const client = {
    from: () => ({
      insert: async (payload: unknown) => {
        if (!error) inserted.push(payload);
        return { error };
      },
    }),
  };
  return { client: client as never, inserted };
}

// A fake that returns a different result per insert call, so we can test a
// poison row sitting in front of a good one.
function seqSupabase(results: ({ code: string } | null)[]) {
  let i = 0;
  const inserted: unknown[] = [];
  const client = {
    from: () => ({
      insert: async (payload: unknown) => {
        const error = results[i++] ?? null;
        if (!error) inserted.push(payload);
        return { error };
      },
    }),
  };
  return { client: client as never, inserted };
}

test("enqueue adds a client_token and flush drains the queue", async () => {
  await enqueue("needs", {
    category: "water",
    urgency: "high",
    lat: 10,
    lng: -66,
  });
  expect(await pendingCount()).toBe(1);

  const { client, inserted } = fakeSupabase();
  expect(await flush(client)).toBe(1);
  expect(await pendingCount()).toBe(0);
  expect((inserted[0] as { client_token: string }).client_token).toBeTruthy();
});

test("a duplicate (23505) is treated as already-synced and removed", async () => {
  await enqueue("hazards", {
    type: "gas_leak",
    severity: "high",
    lat: 10,
    lng: -66,
  });
  const { client } = fakeSupabase({ code: "23505" });
  expect(await flush(client)).toBe(1);
  expect(await pendingCount()).toBe(0);
});

test("a network/server error keeps the item queued for retry", async () => {
  await enqueue("needs", {
    category: "food",
    urgency: "low",
    lat: 10,
    lng: -66,
  });
  const { client } = fakeSupabase({ code: "500" });
  expect(await flush(client)).toBe(0);
  expect(await pendingCount()).toBe(1);
});

test("flush preserves order and stops at the first failure", async () => {
  await enqueue("needs", {
    category: "water",
    urgency: "high",
    lat: 1,
    lng: 1,
  });
  await enqueue("needs", { category: "food", urgency: "low", lat: 2, lng: 2 });

  // Fail every insert; nothing should drain, order preserved.
  const { client } = fakeSupabase({ code: "500" });
  expect(await flush(client)).toBe(0);
  expect(await pendingCount()).toBe(2);

  const first = (await db.outbox.orderBy("createdAt").first())?.payload;
  expect((first as unknown as { category: string }).category).toBe("water");
});

test("a poison row is dead-lettered and does not block the rest of the queue", async () => {
  await enqueue("needs", {
    category: "water",
    urgency: "high",
    lat: 1,
    lng: 1,
  });
  await enqueue("needs", { category: "food", urgency: "low", lat: 2, lng: 2 });

  // First insert hits a permanent constraint error (23502 not-null); second is
  // fine. The bad row must not stop the good one from syncing.
  const { client, inserted } = seqSupabase([{ code: "23502" }, null]);
  expect(await flush(client)).toBe(1);
  expect(inserted).toHaveLength(1);
  expect((inserted[0] as { category: string }).category).toBe("food");

  expect(await pendingCount()).toBe(0); // nothing left actively waiting
  expect(await failedCount()).toBe(1); // the poison row is parked, not lost
});

test("a row that keeps failing transiently is dead-lettered after MAX_ATTEMPTS", async () => {
  await enqueue("needs", {
    category: "water",
    urgency: "high",
    lat: 1,
    lng: 1,
  });

  // Five transient (500) flushes; on the fifth the item crosses the cap.
  const { client } = fakeSupabase({ code: "500" });
  for (let i = 0; i < 5; i++) await flush(client);

  expect(await pendingCount()).toBe(0);
  expect(await failedCount()).toBe(1);
});
