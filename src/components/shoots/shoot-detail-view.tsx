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
import { countRsvpStatuses, type InviteStatus } from "@/server/shoot-roster";

import {
  confirmShootAction,
  updateShootDetailsAction,
} from "@/app/shoots/[id]/actions";
import { PersonSheet } from "@/components/shoots/person-sheet";

export type ShootDetailData = {
  id: string;
  status: "tentative" | "confirmed";
  title: string | null;
  locationAddress: string | null;
  locationMapUrl: string | null;
  locationNotes: string | null;
  dayIsos: string[];
  days: { id: string; dateIso: string; halfDay: "AM" | "PM"; defaultCallTime: string }[];
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
    lastReminderSentAt: string | null;
    overrides: { shootDayId: string; callTime: string }[];
  }[];
  tentativeRatio: { availableCount: number; totalCount: number } | null;
};

const INVITE_TONE: Record<InviteStatus, "forest" | "burgundy" | "taupe"> = {
  accepted: "forest",
  declined: "burgundy",
  pending: "taupe",
};

const INVITE_LABEL: Record<InviteStatus, string> = {
  accepted: "Accepted",
  declined: "Declined",
  pending: "Pending",
};

function dateRangeLabel(dayIsos: string[]) {
  if (dayIsos.length === 0) return "No dates set";
  if (dayIsos.length === 1) return dayIsos[0];
  return `${dayIsos[0]} – ${dayIsos[dayIsos.length - 1]}`;
}

export function ShootDetailView({ shoot, isOrganiser }: { shoot: ShootDetailData; isOrganiser: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const [confirming, startConfirmTransition] = useTransition();

  const invitesByMembership = new Map(shoot.invites.map((inv) => [inv.membershipId, inv]));
  const rsvpCounts = countRsvpStatuses(shoot.invites);
  const where = shoot.locationAddress ?? "No location set yet";

  const activePerson = shoot.activeSlots.find((s) => s.membershipId === activeMembershipId);
  const activeInvite = activeMembershipId ? invitesByMembership.get(activeMembershipId) : undefined;

  return (
    <PageShell maxWidth="max-w-6xl">
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <StatusDot
            tone={shoot.status === "confirmed" ? "forest" : "terracotta"}
            label={shoot.status === "confirmed" ? "Confirmed" : "Tentative"}
          />
          {isOrganiser && (
            <button type="button" onClick={() => setEditOpen(true)} className="text-[12px] font-semibold text-burgundy">
              Edit
            </button>
          )}
        </div>
        <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy md:text-3xl">{shoot.title ?? "Shoot"}</h1>
        <p className="text-[13px] text-ink-soft">{dateRangeLabel(shoot.dayIsos)}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
        <div>
          {shoot.status === "tentative" && (
            <div className="mb-6">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Availability</p>
              {shoot.tentativeRatio && shoot.tentativeRatio.totalCount > 0 ? (
                <ProportionBar
                  segments={[
                    { tone: "forest", label: "Available", count: shoot.tentativeRatio.availableCount },
                    {
                      tone: "ink-faint",
                      label: "Not yet",
                      count: shoot.tentativeRatio.totalCount - shoot.tentativeRatio.availableCount,
                    },
                  ]}
                />
              ) : (
                <p className="text-[13px] text-ink-soft">No crew added to this shoot yet.</p>
              )}
              <p className="mt-3 text-[11.5px] italic text-ink-faint">
                No invites have gone out yet. Confirming this shoot sends them and opens the RSVP roster.
              </p>

              {isOrganiser && (
                <Button
                  variant="primary"
                  disabled={confirming}
                  onClick={() =>
                    startConfirmTransition(async () => {
                      await confirmShootAction(shoot.id);
                    })
                  }
                  className="mt-4"
                >
                  {confirming ? "Confirming…" : "Confirm shoot"}
                </Button>
              )}
            </div>
          )}

          {shoot.status === "confirmed" && (
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
                {shoot.activeSlots.map((slot) => {
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
                        <StatusDot tone={INVITE_TONE[invite.status]} label={INVITE_LABEL[invite.status]} />
                      ) : (
                        <span className="text-[12px] text-ink-faint">No invite</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {shoot.removedSlots.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                    Removed (RSVP kept)
                  </p>
                  {shoot.removedSlots.map((slot) => (
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
          {shoot.locationMapUrl && (
            <a
              href={shoot.locationMapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[12px] font-semibold text-burgundy"
            >
              Open map
            </a>
          )}
          {shoot.locationNotes && <p className="mt-2 text-[12px] text-ink-soft">{shoot.locationNotes}</p>}
        </div>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit shoot details">
        <EditDetailsForm shoot={shoot} onSaved={() => setEditOpen(false)} />
      </Sheet>

      {activePerson && activeMembershipId && (
        <PersonSheet
          shootId={shoot.id}
          memberName={activePerson.memberName ?? "Unknown"}
          invite={activeInvite ?? null}
          days={shoot.days}
          isOrganiser={isOrganiser}
          onClose={() => setActiveMembershipId(null)}
        />
      )}
    </PageShell>
  );
}

function EditDetailsForm({ shoot, onSaved }: { shoot: ShootDetailData; onSaved: () => void }) {
  const [title, setTitle] = useState(shoot.title ?? "");
  const [locationAddress, setLocationAddress] = useState(shoot.locationAddress ?? "");
  const [locationMapUrl, setLocationMapUrl] = useState(shoot.locationMapUrl ?? "");
  const [locationNotes, setLocationNotes] = useState(shoot.locationNotes ?? "");
  const [callTimes, setCallTimes] = useState<Record<string, string>>(
    Object.fromEntries(shoot.days.map((d) => [d.id, d.defaultCallTime])),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateShootDetailsAction(shoot.id, {
      title,
      locationAddress,
      locationMapUrl,
      locationNotes,
      dayCallTimes: shoot.days.map((d) => ({ dayId: d.id, defaultCallTime: callTimes[d.id] ?? d.defaultCallTime })),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rooftop chase scene" />
      <TextField label="Location address" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
      <TextField label="Map link" value={locationMapUrl} onChange={(e) => setLocationMapUrl(e.target.value)} placeholder="https://maps.google.com/…" />
      <TextAreaField
        label="Location notes"
        value={locationNotes}
        onChange={(e) => setLocationNotes(e.target.value)}
        placeholder="Parking, nearest hospital, load-in instructions…"
      />

      {shoot.days.length > 0 && (
        <div className="mb-[18px]">
          <p className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Default call time</p>
          {shoot.days.map((day) => (
            <div key={day.id} className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-ink-soft">
                {day.dateIso} · {HALF_DAY_LABEL[day.halfDay]}
              </span>
              <input
                type="time"
                value={callTimes[day.id] ?? day.defaultCallTime}
                onChange={(e) => setCallTimes((prev) => ({ ...prev, [day.id]: e.target.value }))}
                className="rounded-md border border-hairline bg-white px-2 py-1 text-[12.5px]"
              />
            </div>
          ))}
          {shoot.status === "confirmed" && (
            <p className="text-[11px] italic text-ink-faint">
              Changing the call time or location here emails everyone still invited, with an updated calendar invite.
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
