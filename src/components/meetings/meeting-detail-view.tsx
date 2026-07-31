"use client";

import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { RequiredMarker, StatusDot } from "@/components/ui/status-dot";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { HALF_DAY_LABEL } from "@/lib/half-day";
import { countRsvpStatuses, inviteStatusLabel, type InviteResponseSource, type InviteStatus } from "@/server/invite-roster";
import { LocationMap } from "@/components/location/location-map";
import { LocationPicker, type LocationFields } from "@/components/location/location-picker";

import {
  confirmMeetingAction,
  updateMeetingDetailsAction,
} from "@/app/meetings/[id]/actions";
import { PersonSheet } from "@/components/meetings/person-sheet";

export type MeetingDetailData = {
  id: string;
  status: "tentative" | "confirmed";
  title: string | null;
  locationAddress: string | null;
  locationPlaceId: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationMapUrl: string | null;
  locationNotes: string | null;
  dayIsos: string[];
  days: { id: string; dateIso: string; halfDay: "AM" | "PM"; defaultStartTime: string }[];
  activeSlots: {
    id: string;
    kind: "required" | "general";
    membershipId: string | null;
    placeholderLabel: string | null;
    memberName: string | null;
  }[];
  removedSlots: { id: string; memberName: string }[];
  invites: {
    id: string;
    membershipId: string;
    memberName: string;
    status: InviteStatus;
    responseSource: InviteResponseSource;
    lastReminderSentAt: string | null;
    overrides: { meetingDayId: string; startTime: string }[];
  }[];
  tentativeRatio: { availableCount: number; totalCount: number } | null;
};

const INVITE_TONE: Record<InviteStatus, "forest" | "burgundy" | "taupe"> = {
  accepted: "forest",
  declined: "burgundy",
  pending: "taupe",
};

function dateRangeLabel(dayIsos: string[]) {
  if (dayIsos.length === 0) return "No dates set";
  if (dayIsos.length === 1) return dayIsos[0];
  return `${dayIsos[0]} – ${dayIsos[dayIsos.length - 1]}`;
}

export function MeetingDetailView({ meeting, isOrganiser }: { meeting: MeetingDetailData; isOrganiser: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const [confirming, startConfirmTransition] = useTransition();

  const invitesByMembership = new Map(meeting.invites.map((inv) => [inv.membershipId, inv]));
  const rsvpCounts = countRsvpStatuses(meeting.invites);
  const where = meeting.locationAddress ?? "No location set yet";

  const activePerson = meeting.activeSlots.find((s) => s.membershipId === activeMembershipId);
  const activeInvite = activeMembershipId ? invitesByMembership.get(activeMembershipId) : undefined;

  return (
    <PageShell maxWidth="max-w-6xl">
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <StatusDot
            tone={meeting.status === "confirmed" ? "forest" : "terracotta"}
            label={meeting.status === "confirmed" ? "Confirmed" : "Tentative"}
          />
          {isOrganiser && (
            <button type="button" onClick={() => setEditOpen(true)} className="text-[12px] font-semibold text-burgundy">
              Edit
            </button>
          )}
        </div>
        <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy md:text-3xl">{meeting.title ?? "Meeting"}</h1>
        <p className="text-[13px] text-ink-soft">{dateRangeLabel(meeting.dayIsos)}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
        <div>
          {meeting.status === "tentative" && (
            <div className="mb-6">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Availability</p>
              {meeting.tentativeRatio && meeting.tentativeRatio.totalCount > 0 ? (
                <ProportionBar
                  segments={[
                    { tone: "forest", label: "Available", count: meeting.tentativeRatio.availableCount },
                    {
                      tone: "ink-faint",
                      label: "Not yet",
                      count: meeting.tentativeRatio.totalCount - meeting.tentativeRatio.availableCount,
                    },
                  ]}
                />
              ) : (
                <p className="text-[13px] text-ink-soft">No crew added to this meeting yet.</p>
              )}
              <p className="mt-3 text-[11.5px] italic text-ink-faint">
                No invites have gone out yet. Confirming this meeting sends them and opens the RSVP roster.
              </p>

              {isOrganiser && (
                <Button
                  variant="primary"
                  disabled={confirming}
                  onClick={() =>
                    startConfirmTransition(async () => {
                      await confirmMeetingAction(meeting.id);
                    })
                  }
                  className="mt-4"
                >
                  {confirming ? "Confirming…" : "Confirm meeting"}
                </Button>
              )}
            </div>
          )}

          {meeting.status === "confirmed" && (
            <div className="mb-6">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">RSVPs</p>
              <ProportionBar
                segments={[
                  { tone: "forest", label: "Accepted", count: rsvpCounts.accepted },
                  { tone: "burgundy", label: "Declined", count: rsvpCounts.declined },
                  { tone: "taupe", label: "Pending", count: rsvpCounts.pending },
                ]}
              />

              <div className="mt-4">
                {meeting.activeSlots.map((slot) => {
                  const invite = slot.membershipId ? invitesByMembership.get(slot.membershipId) : undefined;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!slot.membershipId || !isOrganiser}
                      onClick={() => slot.membershipId && setActiveMembershipId(slot.membershipId)}
                      className="flex w-full items-center justify-between border-b border-hairline py-2.5 text-left last:border-b-0 disabled:cursor-default"
                    >
                      <span className="flex items-center gap-2.5">
                        <Avatar name={slot.memberName ?? slot.placeholderLabel ?? "?"} />
                        <span className="text-[13.5px] font-medium">
                          {slot.memberName ?? `${slot.placeholderLabel} (placeholder)`}
                        </span>
                        {slot.kind === "required" && <RequiredMarker />}
                      </span>
                      {invite ? (
                        <StatusDot
                          tone={INVITE_TONE[invite.status]}
                          label={inviteStatusLabel(invite.status, invite.responseSource)}
                        />
                      ) : (
                        <span className="text-[12px] text-ink-faint">No invite</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {meeting.removedSlots.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                    Removed (RSVP kept)
                  </p>
                  {meeting.removedSlots.map((slot) => (
                    <p key={slot.id} className="py-1 text-[12.5px] text-ink-faint line-through">
                      {slot.memberName}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 rounded-md border border-hairline bg-white p-4 lg:mt-0">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Location</p>
          <p className="text-[13px] text-ink-soft">{where}</p>
          {meeting.locationMapUrl && (
            <a
              href={meeting.locationMapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[12px] font-semibold text-burgundy"
            >
              Open map
            </a>
          )}
          {meeting.locationLat != null && meeting.locationLng != null && (
            <LocationMap lat={meeting.locationLat} lng={meeting.locationLng} />
          )}
          {meeting.locationNotes && <p className="mt-2 text-[12px] text-ink-soft">{meeting.locationNotes}</p>}
        </div>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit meeting details">
        <EditDetailsForm meeting={meeting} onSaved={() => setEditOpen(false)} />
      </Sheet>

      {activePerson && activeMembershipId && (
        <PersonSheet
          meetingId={meeting.id}
          memberName={activePerson.memberName ?? "Unknown"}
          invite={activeInvite ?? null}
          days={meeting.days}
          isOrganiser={isOrganiser}
          onClose={() => setActiveMembershipId(null)}
        />
      )}
    </PageShell>
  );
}

function EditDetailsForm({ meeting, onSaved }: { meeting: MeetingDetailData; onSaved: () => void }) {
  const [title, setTitle] = useState(meeting.title ?? "");
  const [location, setLocation] = useState<LocationFields>({
    locationAddress: meeting.locationAddress ?? "",
    locationMapUrl: meeting.locationMapUrl ?? "",
    locationPlaceId: meeting.locationPlaceId,
    locationLat: meeting.locationLat,
    locationLng: meeting.locationLng,
  });
  const [locationNotes, setLocationNotes] = useState(meeting.locationNotes ?? "");
  const [startTimes, setStartTimes] = useState<Record<string, string>>(
    Object.fromEntries(meeting.days.map((d) => [d.id, d.defaultStartTime])),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateMeetingDetailsAction(meeting.id, {
      title,
      ...location,
      locationNotes,
      dayStartTimes: meeting.days.map((d) => ({ dayId: d.id, defaultStartTime: startTimes[d.id] ?? d.defaultStartTime })),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Production meeting" />
      <LocationPicker value={location} onChange={setLocation} />
      <TextField
        label="Map link"
        value={location.locationMapUrl}
        onChange={(e) => setLocation((prev) => ({ ...prev, locationMapUrl: e.target.value }))}
        placeholder="https://maps.google.com/…"
        hint="Auto-filled when you pick an address above; you can still edit or paste your own link."
      />
      <TextAreaField
        label="Location notes"
        value={locationNotes}
        onChange={(e) => setLocationNotes(e.target.value)}
        placeholder="Parking, entrance, room number…"
      />

      {meeting.days.length > 0 && (
        <div className="mb-[18px]">
          <p className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Default start time</p>
          {meeting.days.map((day) => (
            <div key={day.id} className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-ink-soft">
                {day.dateIso} · {HALF_DAY_LABEL[day.halfDay]}
              </span>
              <input
                type="time"
                value={startTimes[day.id] ?? day.defaultStartTime}
                onChange={(e) => setStartTimes((prev) => ({ ...prev, [day.id]: e.target.value }))}
                className="rounded-md border border-hairline bg-white px-2 py-1 text-[12.5px]"
              />
            </div>
          ))}
          {meeting.status === "confirmed" && (
            <p className="text-[11px] italic text-ink-faint">
              Changing the start time or location here emails everyone still invited, with an updated calendar invite.
            </p>
          )}
        </div>
      )}

      <Button variant="primary" disabled={saving} onClick={handleSave} className="w-full">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
