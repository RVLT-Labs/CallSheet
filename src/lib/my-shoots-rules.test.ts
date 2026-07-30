import { describe, expect, it } from "vitest";

import {
  STICKY_ACCEPT_ALL_THRESHOLD,
  isShootVisibleToCrew,
  needsStickyAcceptAllFooter,
  splitSoonestPending,
} from "@/lib/my-shoots-rules";

describe("splitSoonestPending", () => {
  it("returns null soonest and an empty rest for zero pending invites", () => {
    expect(splitSoonestPending([])).toEqual({ soonest: null, rest: [] });
  });

  it("puts the single item on soonest, not rest", () => {
    expect(splitSoonestPending(["a"])).toEqual({ soonest: "a", rest: [] });
  });

  it("splits the first item as soonest, everything else as rest — never N separate cards", () => {
    expect(splitSoonestPending(["a", "b", "c"])).toEqual({ soonest: "a", rest: ["b", "c"] });
  });
});

describe("needsStickyAcceptAllFooter", () => {
  it("stays hidden below the threshold", () => {
    expect(needsStickyAcceptAllFooter(STICKY_ACCEPT_ALL_THRESHOLD - 1)).toBe(false);
    expect(needsStickyAcceptAllFooter(0)).toBe(false);
  });

  it("appears once the list is long enough to need it", () => {
    expect(needsStickyAcceptAllFooter(STICKY_ACCEPT_ALL_THRESHOLD)).toBe(true);
    expect(needsStickyAcceptAllFooter(STICKY_ACCEPT_ALL_THRESHOLD + 5)).toBe(true);
  });
});

describe("isShootVisibleToCrew", () => {
  it("always shows a Confirmed shoot", () => {
    expect(isShootVisibleToCrew("confirmed", false)).toBe(true);
    expect(isShootVisibleToCrew("confirmed", true)).toBe(true);
  });

  it("gates a Tentative shoot behind the film's showTentativeToCrew setting", () => {
    expect(isShootVisibleToCrew("tentative", false)).toBe(false);
    expect(isShootVisibleToCrew("tentative", true)).toBe(true);
  });
});
