import { expect, test } from "vitest";

import { safeNext } from "./safeNext";

test("safeNext allows in-app paths, rejects open redirects", () => {
  expect(safeNext("/panel")).toBe("/panel");
  expect(safeNext("/coordinador")).toBe("/coordinador");
  // open-redirect attempts fall back to the default
  expect(safeNext("//evil.com")).toBe("/panel");
  expect(safeNext("https://evil.com")).toBe("/panel");
  expect(safeNext("evil.com")).toBe("/panel");
  expect(safeNext(undefined)).toBe("/panel");
});
