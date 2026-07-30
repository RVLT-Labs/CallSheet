"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StatusDot } from "@/components/ui/status-dot";
import { canNudgeInvite, type InviteStatus } from "@/server/shoot-roster";

import {
  nudgeInviteAction,
  removePersonAction,
  setCallTimeOverrideAction,
} from "@/app/shoots/[id]/actions";

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

const HALF_DAY_LABEL: Record<"AM" | "PM", string> = { AM: "Morning", PM: "Afternoon" };

type PersonSheetProps = {
  shootId: string;
  memberName: string;
  invite: {
    id: string;
    membershipId: string;
    status: InviteStatus;
    lastReminderSentAt: string | null;
    overrides: { shootDayId: string; callTime: string }[];
  } | null;
  days: { id: string; dateIso: string; halfDay: "AM" | "PM"; defaultCallTime: string }[];
  isOrganiser: boolean;
  onClose: () => void;
};

export function PersonSheet({ shootId, memberName, invite, days, isOrganiser, onClose }: PersonSheetProps) {
  const [pending, startTransition] = useTransition();
  const overrideByDay = new Map(invite?.overrides.map((o) => [o.shootDayId, o.callTime]));
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(days.map((d) => [d.id, overrideByDay.get(d.id) ?? ""])),
  );

  function saveOverride(dayId: string) {
    if (!invite) return;
    startTransition(async () => {
      await setCallTimeOverrideAction(shootId, invite.id, dayId, drafts[dayId] ?? "");
    });
  }

  return (
    <Sheet open onClose={onClose} title={memberName}>
      {invite && (
        <div className="mb-4">
          <StatusDot tone={INVITE_TONE[invite.status]} label={INVITE_LABEL[invite.status]} />
        </div>
      )}

      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Call time</p>
      {days.map((day) => (
        <div key={day.id} className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-ink-soft">
            {day.dateIso} · {HALF_DAY_LABEL[day.halfDay]}
          </span>
          {isOrganiser ? (
            <input
              type="time"
              value={drafts[day.id] ?? ""}
              placeholder={day.defaultCallTime}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [day.id]: e.target.value }))}
              onBlur={() => saveOverride(day.id)}
              className="rounded-md border border-hairline bg-white px-2 py-1 text-[12.5px]"
            />
          ) : (
            <span className="font-mono text-[12.5px]">{drafts[day.id] || day.defaultCallTime}</span>
          )}
        </div>
      ))}
      <p className="mb-4 text-[11px] italic text-ink-faint">
        Leave blank to use the day&apos;s default call time.
      </p>

      {isOrganiser && invite && (
        <div className="flex gap-3">
          <Button
            variant="secondary"
            disabled={pending || !canNudgeInvite(invite.status)}
            onClick={() => startTransition(() => nudgeInviteAction(shootId, invite.id))}
            className="flex-1"
          >
            Nudge
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${memberName} from this shoot?`)) return;
              startTransition(async () => {
                await removePersonAction(shootId, invite.membershipId);
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
