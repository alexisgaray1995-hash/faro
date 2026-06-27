import { describe, expect, it } from "vitest";

import { parseTriage } from "@/lib/ai/triage";

describe("parseTriage", () => {
  it("accepts a valid model response", () => {
    const out = parseTriage(
      '{"category":"medical","urgency":"critical","rationale":"herido grave"}',
    );
    expect(out).toEqual({
      category: "medical",
      urgency: "critical",
      rationale: "herido grave",
    });
  });

  it("rejects categories or urgencies outside our enums", () => {
    expect(
      parseTriage('{"category":"banana","urgency":"high","rationale":"x"}'),
    ).toBeNull();
    expect(
      parseTriage('{"category":"water","urgency":"urgent","rationale":"x"}'),
    ).toBeNull();
  });

  it("rejects malformed JSON and non-strings", () => {
    expect(parseTriage("not json")).toBeNull();
    expect(parseTriage(null)).toBeNull();
    expect(parseTriage({ category: "water" })).toBeNull();
  });

  it("defaults rationale to empty and caps its length", () => {
    const out = parseTriage('{"category":"food","urgency":"low"}');
    expect(out?.rationale).toBe("");
    const long = parseTriage(
      `{"category":"food","urgency":"low","rationale":"${"x".repeat(500)}"}`,
    );
    expect(long?.rationale.length).toBe(200);
  });
});
