import { describe, expect, it } from "vitest";

import { buildInviteIcs } from "@/lib/ics";

const baseInput = {
  eventTitle: "Rooftop scene",
  filename: "shoot.ics",
  locationAddress: "123 Main St, Springfield",
  locationLat: null as number | null,
  locationLng: null as number | null,
  locationMapUrl: null as string | null,
  locationNotes: "Parking around back",
  icsUid: "shoot-abc",
  icsSequence: 0,
  days: [{ id: "day-1", dateIso: "2026-08-05", halfDay: "AM" as const, startTime: "08:00" }],
};

describe("buildInviteIcs", () => {
  it("includes the location address as LOCATION even without coordinates", () => {
    const result = buildInviteIcs(baseInput);
    expect(result?.content).toContain("LOCATION:123 Main St\\, Springfield");
    expect(result?.content).not.toContain("GEO:");
  });

  it("includes a GEO line when coordinates are set", () => {
    const result = buildInviteIcs({ ...baseInput, locationLat: 40.7128, locationLng: -74.006 });
    expect(result?.content).toContain("GEO:40.7128;-74.006");
  });

  it("includes the map link as URL when set", () => {
    const result = buildInviteIcs({ ...baseInput, locationMapUrl: "https://maps.google.com/?q=123+Main+St" });
    expect(result?.content).toContain("URL:https://maps.google.com/?q=123+Main+St");
  });

  it("omits GEO and URL when no coordinates or map link are set", () => {
    const result = buildInviteIcs(baseInput);
    expect(result?.content).not.toContain("GEO:");
    expect(result?.content).not.toContain("URL:");
  });
});
