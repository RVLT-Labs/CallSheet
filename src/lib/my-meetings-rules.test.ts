import { describe, expect, it } from "vitest";

import { isMeetingVisibleToCrew } from "@/lib/my-meetings-rules";

describe("isMeetingVisibleToCrew", () => {
  it("always shows a Confirmed meeting", () => {
    expect(isMeetingVisibleToCrew("confirmed", false)).toBe(true);
    expect(isMeetingVisibleToCrew("confirmed", true)).toBe(true);
  });

  it("gates a Tentative meeting behind the film's showTentativeToCrew setting", () => {
    expect(isMeetingVisibleToCrew("tentative", false)).toBe(false);
    expect(isMeetingVisibleToCrew("tentative", true)).toBe(true);
  });
});
