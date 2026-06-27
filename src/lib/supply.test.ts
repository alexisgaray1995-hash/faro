import { expect, test } from "vitest";

import {
  draftsToRows,
  pinStatus,
  supplyLineText,
  type SupplyLine,
} from "./supply";

test("closed point is grey regardless of stock", () => {
  const s: SupplyLine[] = [{ category: "water", status: "ok" }];
  expect(pinStatus(s, false)).toBe("closed");
});

test("no supply data is neutral, never red", () => {
  expect(pinStatus(null, true)).toBe("neutral");
  expect(pinStatus([], true)).toBe("neutral");
});

test("a critical category out turns the pin red", () => {
  const s: SupplyLine[] = [
    { category: "water", status: "out" },
    { category: "hygiene", status: "ok" },
  ];
  expect(pinStatus(s, true)).toBe("critical");
});

test("a non-critical category out does not turn the pin red", () => {
  const s: SupplyLine[] = [{ category: "hygiene", status: "out" }];
  expect(pinStatus(s, true)).toBe("low");
});

test("anything low (and nothing critical-out) is amber", () => {
  const s: SupplyLine[] = [{ category: "food", status: "low" }];
  expect(pinStatus(s, true)).toBe("low");
});

test("all stocked is green", () => {
  const s: SupplyLine[] = [{ category: "water", status: "ok" }];
  expect(pinStatus(s, true)).toBe("ok");
});

test("supplyLineText appends quantity and unit when present", () => {
  expect(supplyLineText({ category: "water", status: "ok" })).toBe(
    "Agua: Disponible",
  );
  expect(
    supplyLineText({
      category: "water",
      status: "low",
      quantity: 200,
      unit: "L",
    }),
  ).toBe("Agua: Poco · 200 L");
});

test("draftsToRows parses blanks to null and numbers from strings", () => {
  const rows = draftsToRows({
    water: { status: "ok", quantity: "200", unit: "L" },
    food: { status: "out", quantity: "", unit: "" },
  });
  expect(rows).toContainEqual({
    category: "water",
    status: "ok",
    quantity: 200,
    unit: "L",
  });
  expect(rows).toContainEqual({
    category: "food",
    status: "out",
    quantity: null,
    unit: null,
  });
});
