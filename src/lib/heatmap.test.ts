import { describe, expect, it } from "vitest";

import { majorityTier } from "@/lib/heatmap";

describe("majorityTier", () => {
  it("returns null when nobody has any known availability", () => {
    expect(majorityTier([null, null])).toBeNull();
    expect(majorityTier([])).toBeNull();
  });

  it("returns the clear majority", () => {
    expect(majorityTier(["best", "best", "ok"])).toBe("best");
    expect(majorityTier(["unavailable", "unavailable", "ok"])).toBe("unavailable");
  });

  it("ignores unknowns rather than counting them as a tier", () => {
    expect(majorityTier(["best", null, null])).toBe("best");
  });

  it("breaks an even split worst-first, so the summary never overstates availability", () => {
    expect(majorityTier(["best", "ok"])).toBe("ok");
    expect(majorityTier(["ok", "unavailable"])).toBe("unavailable");
    expect(majorityTier(["best", "unavailable"])).toBe("unavailable");
  });
});
