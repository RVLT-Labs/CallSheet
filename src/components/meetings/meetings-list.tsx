"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { MeetingSlotSwap } from "@/components/meetings/meeting-slot-swap";
import { Card } from "@/components/ui/card";
import { PillRow } from "@/components/ui/pill-row";
import { StatusDot } from "@/components/ui/status-dot";
import { TextField } from "@/components/ui/text-field";

export type MeetingListItem = {
  id: string;
  title: string | null;
  status: "tentative" | "confirmed";
  dateIsos: string[];
  requiredCount: number;
  generalCount: number;
  placeholderSlots: { id: string; label: string }[];
};

function dateRangeLabel(dateIsos: string[]) {
  if (dateIsos.length === 0) return "No date set";
  if (dateIsos.length === 1) return dateIsos[0];
  return `${dateIsos[0]} – ${dateIsos[dateIsos.length - 1]}`;
}

/**
 * Organiser's meeting list: search plus a Cards/Table toggle, mirroring
 * ShootsList — a months-long production means dozens of scheduled meetings,
 * not a handful, so a card grid alone stops scanning well past a certain size.
 */
export function MeetingsList({
  meetings,
  crew,
}: {
  meetings: MeetingListItem[];
  crew: { membershipId: string; name: string }[];
}) {
  const [view, setView] = useState<"cards" | "table">("table");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) => (m.title ?? "").toLowerCase().includes(q) || m.dateIsos.some((d) => d.includes(q)),
    );
  }, [meetings, search]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <TextField
            label="Search meetings"
            placeholder="Title or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mb-[18px]">
          <PillRow
            aria-label="Meetings view"
            value={view}
            onChange={setView}
            options={[
              { value: "cards", label: "Cards" },
              { value: "table", label: "Table" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-[13px] text-ink-soft">No meetings match &quot;{search}&quot;.</p>
      )}

      {filtered.length > 0 && view === "cards" && (
        <div className="md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {filtered.map((meeting) => (
            <div key={meeting.id} className="mb-4 last:mb-0 md:mb-0">
              <Card>
                <Link href={`/meetings/${meeting.id}`} className="mb-1.5 flex items-center justify-between">
                  <p className="text-[14px] font-semibold">{meeting.title ?? dateRangeLabel(meeting.dateIsos)}</p>
                  <StatusDot
                    tone={meeting.status === "confirmed" ? "forest" : "terracotta"}
                    label={meeting.status === "confirmed" ? "Confirmed" : "Tentative"}
                  />
                </Link>
                <p className="mb-2 text-[12px] text-ink-soft">
                  {meeting.requiredCount} required · {meeting.generalCount} general
                </p>
                {meeting.placeholderSlots.map((slot) => (
                  <MeetingSlotSwap key={slot.id} slotId={slot.id} label={slot.label} crew={crew} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && view === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Meeting</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Crew</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((meeting) => (
                <tr key={meeting.id} className="border-b border-hairline last:border-b-0 hover:bg-cream-deep">
                  <td className="py-2.5 pr-4">
                    <Link href={`/meetings/${meeting.id}`} className="font-medium text-ink">
                      {meeting.title ?? "Meeting"}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{dateRangeLabel(meeting.dateIsos)}</td>
                  <td className="py-2.5 pr-4">
                    <StatusDot
                      tone={meeting.status === "confirmed" ? "forest" : "terracotta"}
                      label={meeting.status === "confirmed" ? "Confirmed" : "Tentative"}
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {meeting.requiredCount} required · {meeting.generalCount} general
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
