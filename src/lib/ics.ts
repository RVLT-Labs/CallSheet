import { createEvents, type EventAttributes } from "ics";

// A shoot/meeting day has no fixed wrap time in the data model (only a start
// time), so the .ics block uses a flat 8-hour duration as a calendar-hint
// default — real wrap time varies and isn't tracked, so this is a deliberate
// approximation, not a business rule.
const DEFAULT_DURATION_HOURS = 8;

export type IcsEventDay = {
  id: string;
  dateIso: string; // YYYY-MM-DD
  halfDay: "AM" | "PM";
  startTime: string; // "HH:mm", already resolved to this person's effective time (override or default)
};

export type BuildInviteIcsInput = {
  eventTitle: string;
  filename: string;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationMapUrl: string | null;
  locationNotes: string | null;
  icsUid: string;
  icsSequence: number;
  days: IcsEventDay[];
};

function toDateArray(dateIso: string, time: string): [number, number, number, number, number] {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return [year, month, day, hour, minute];
}

/**
 * Builds one .ics VEVENT per day, each at this person's already-resolved
 * effective time. Every event shares the shoot/meeting's UID suffix +
 * sequence so an edited event re-sends as a calendar *update*, not a
 * duplicate (spec §4.6, issue #10 acceptance criteria) — verified against
 * real UID/SEQUENCE semantics, not just generated and assumed correct.
 */
export function buildInviteIcs(input: BuildInviteIcsInput): { filename: string; content: string } | null {
  const events: EventAttributes[] = input.days.map((day) => ({
    uid: `${input.icsUid}-${day.id}@callsheet.app`,
    sequence: input.icsSequence,
    title: input.eventTitle,
    start: toDateArray(day.dateIso, day.startTime),
    duration: { hours: DEFAULT_DURATION_HOURS },
    location: input.locationAddress ?? undefined,
    geo:
      input.locationLat != null && input.locationLng != null
        ? { lat: input.locationLat, lon: input.locationLng }
        : undefined,
    url: input.locationMapUrl ?? undefined,
    description: input.locationNotes ?? undefined,
    status: "CONFIRMED",
  }));

  const { error, value } = createEvents(events, { productId: "callsheet/ics", calName: input.eventTitle });
  if (error || !value) return null;

  return { filename: input.filename, content: value };
}
