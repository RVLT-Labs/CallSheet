import { describe, expect, it } from "vitest";

import { calculateAcceptanceRate } from "@/lib/wrap-summary";

describe("calculateAcceptanceRate", () => {
  it("returns null when nobody was ever invited, rather than reporting a false 0%", () => {
    expect(calculateAcceptanceRate(0, 0)).toBeNull();
  });

  it("rounds to the nearest whole percent", () => {
    expect(calculateAcceptanceRate(1, 3)).toBe(33);
    expect(calculateAcceptanceRate(2, 3)).toBe(67);
  });

  it("handles a perfect and a zero acceptance rate", () => {
    expect(calculateAcceptanceRate(5, 5)).toBe(100);
    expect(calculateAcceptanceRate(0, 5)).toBe(0);
  });
});
