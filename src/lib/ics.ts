import { createEvents, type EventAttributes } from "ics";

import { resolveEffectiveCallTime } from "@/server/shoot-roster";

// A shoot day has no fixed wrap time in the data model (only a call time), so
// the .ics block uses a flat 8-hour duration as a calendar-hint default — real
// wrap time varies by shoot and isn't tracked, so this is a deliberate
// approximation, not a business rule.
const DEFAULT_DURATION_HOURS = 8;

export type IcsShootDay = {
  id: string;
  dateIso: string; // YYYY-MM-DD
  halfDay: "AM" | "PM";
  defaultCallTime: string; // "HH:mm"
};

export type BuildInviteIcsInput = {
  shootTitle: string;
  locationAddress: string | null;
  locationNotes: string | null;
  icsUid: string;
  icsSequence: number;
  days: IcsShootDay[];
  overridesByDayId: Map<string, string>;
};

function toDateArray(dateIso: string, callTime: string): [number, number, number, number, number] {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = callTime.split(":").map(Number);
  return [year, month, day, hour, minute];
}

/**
 * Builds one .ics VEVENT per shoot day, each reflecting this person's
 * effective call time (their override, falling back to the day's default —
 * spec §4.6). Every event shares the shoot's UID suffix + sequence so an
 * edited shoot re-sends as a calendar *update*, not a duplicate (spec §4.6,
 * issue #10 acceptance criteria) — verified against real UID/SEQUENCE
 * semantics, not just generated and assumed correct.
 */
export function buildInviteIcs(input: BuildInviteIcsInput): { filename: string; content: string } | null {
  const events: EventAttributes[] = input.days.map((day) => {
    const callTime = resolveEffectiveCallTime(day.defaultCallTime, input.overridesByDayId.get(day.id));
    return {
      uid: `${input.icsUid}-${day.id}@callsheet.app`,
      sequence: input.icsSequence,
      title: input.shootTitle,
      start: toDateArray(day.dateIso, callTime),
      duration: { hours: DEFAULT_DURATION_HOURS },
      location: input.locationAddress ?? undefined,
      description: input.locationNotes ?? undefined,
      status: "CONFIRMED",
    };
  });

  const { error, value } = createEvents(events, { productId: "callsheet/ics", calName: input.shootTitle });
  if (error || !value) return null;

  return { filename: "shoot.ics", content: value };
}
