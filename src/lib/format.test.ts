import { expect, test } from "vitest";

import { timeAgo } from "./format";

const now = new Date("2026-06-27T12:00:00Z").getTime();
const ago = (ms: number) => new Date(now - ms).toISOString();

test("timeAgo buckets seconds, minutes, hours, days", () => {
  expect(timeAgo(ago(10_000), now)).toBe("hace un momento");
  expect(timeAgo(ago(5 * 60_000), now)).toBe("hace 5 min");
  expect(timeAgo(ago(3 * 3_600_000), now)).toBe("hace 3 h");
  expect(timeAgo(ago(2 * 86_400_000), now)).toBe("hace 2 d");
});

test("timeAgo clamps future timestamps to a moment", () => {
  expect(timeAgo(ago(-5000), now)).toBe("hace un momento");
});
