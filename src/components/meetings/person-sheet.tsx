"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StatusDot } from "@/components/ui/status-dot";
import { canNudgeInvite, inviteStatusLabel, type InviteResponseSource, type InviteStatus } from "@/server/invite-roster";

import {
  nudgeInviteAction,
  overrideInviteStatusAction,
  removePersonAction,
  setStartTimeOverrideAction,
} from "@/app/meetings/[id]/actions";

const INVITE_TONE: Record<InviteStatus, "forest" | "burgundy" | "taupe"> = {
  accepted: "forest",
  declined: "burgundy",
  pending: "taupe",
};

const STATUS_OPTIONS: { status: InviteStatus; label: string }[] = [
  { status: "accepted", label: "Accepted" },
  { status: "declined", label: "Declined" },
  { status: "pending", label: "Pending" },
];

type PersonSheetProps = {
  meetingId: string;
  memberName: string;
  invite: {
    id: string;
    membershipId: string;
    status: InviteStatus;
    responseSource: InviteResponseSource;
    lastReminderSentAt: string | null;
    overrides: { meetingDayId: string; startTime: string }[];
  } | null;
  days: { id: string; dateIso: string; defaultStartTime: string; estimatedEndTime: string }[];
  isOrganiser: boolean;
  onClose: () => void;
};

export function PersonSheet({ meetingId, memberName, invite, days, isOrganiser, onClose }: PersonSheetProps) {
  const [pending, startTransition] = useTransition();
  const overrideByDay = new Map(invite?.overrides.map((o) => [o.meetingDayId, o.startTime]));
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(days.map((d) => [d.id, overrideByDay.get(d.id) ?? ""])),
  );

  function saveOverride(dayId: string) {
    if (!invite) return;
    startTransition(async () => {
      await setStartTimeOverrideAction(meetingId, invite.id, dayId, drafts[dayId] ?? "");
    });
  }

  return (
    <Sheet open onClose={onClose} title={memberName}>
      {invite && (
        <div className="mb-4">
          <StatusDot tone={INVITE_TONE[invite.status]} label={inviteStatusLabel(invite.status, invite.responseSource)} />
        </div>
      )}

      {isOrganiser && invite && (
        <div className="mb-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Set status</p>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.status}
                type="button"
                disabled={pending || invite.status === option.status}
                onClick={() =>
                  startTransition(() => overrideInviteStatusAction(meetingId, invite.id, option.status))
                }
                className="flex-1 rounded-md border border-hairline px-2 py-1.5 text-[12px] font-semibold text-ink-soft disabled:border-burgundy disabled:text-burgundy"
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] italic text-ink-faint">
            Overrides {memberName}&apos;s response. If they respond via their own invite link afterward, their
            response wins.
          </p>
        </div>
      )}

      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Start time</p>
      {days.map((day) => (
        <div key={day.id} className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-ink-soft">
            {day.dateIso} · {day.defaultStartTime}–{day.estimatedEndTime}
          </span>
          {isOrganiser ? (
            <input
              type="time"
              value={drafts[day.id] ?? ""}
              placeholder={day.defaultStartTime}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [day.id]: e.target.value }))}
              onBlur={() => saveOverride(day.id)}
              className="rounded-md border border-hairline bg-white px-2 py-1 text-[12.5px]"
            />
          ) : (
            <span className="font-mono text-[12.5px]">{drafts[day.id] || day.defaultStartTime}</span>
          )}
        </div>
      ))}
      <p className="mb-4 text-[11px] italic text-ink-faint">
        Leave blank to use the day&apos;s default start time.
      </p>

      {isOrganiser && invite && (
        <div className="flex gap-3">
          <Button
            variant="secondary"
            disabled={pending || !canNudgeInvite(invite.status)}
            onClick={() => startTransition(() => nudgeInviteAction(meetingId, invite.id))}
            className="flex-1"
          >
            Nudge
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${memberName} from this meeting?`)) return;
              startTransition(async () => {
                await removePersonAction(meetingId, invite.membershipId);
                onClose();
              });
            }}
            className="flex-1 !text-burgundy"
          >
            Remove
          </Button>
        </div>
      )}
    </Sheet>
  );
}
