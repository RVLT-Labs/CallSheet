// A ShootInvite and a MeetingInvite each carry their own independently unique
// token in separate tables, so a token from an email link could belong to
// either. This is the single place that tries both, so the invite landing
// page and the accept/decline routes don't each duplicate that branching.

import { getInviteByToken as getShootInviteByToken, respondToInvite as respondToShootInvite } from "@/server/shoot-invite-email";
import { getInviteByToken as getMeetingInviteByToken, respondToInvite as respondToMeetingInvite } from "@/server/meeting-invite-email";

export type EventKind = "shoot" | "meeting";

export type ResolvedInviteLookup =
  | {
      ok: true;
      kind: EventKind;
      eventTitle: string;
      status: "pending" | "accepted" | "declined";
      recipientName: string;
    }
  | { ok: false; reason: "not-found" | "expired" };

export async function resolveInviteByToken(token: string): Promise<ResolvedInviteLookup> {
  const shoot = await getShootInviteByToken(token);
  if (shoot.ok) {
    return { ok: true, kind: "shoot", eventTitle: shoot.shootTitle, status: shoot.status, recipientName: shoot.recipientName };
  }
  if (shoot.reason === "expired") return shoot;

  const meeting = await getMeetingInviteByToken(token);
  if (meeting.ok) {
    return { ok: true, kind: "meeting", eventTitle: meeting.meetingTitle, status: meeting.status, recipientName: meeting.recipientName };
  }
  return meeting;
}

export type ResolvedRespondResult =
  | { ok: true; kind: EventKind; eventTitle: string; status: "accepted" | "declined" }
  | { ok: false; reason: "not-found" | "expired" };

export async function respondToInviteByToken(
  token: string,
  response: "accepted" | "declined",
): Promise<ResolvedRespondResult> {
  const shootResult = await respondToShootInvite(token, response);
  if (shootResult.ok) return { ok: true, kind: "shoot", eventTitle: shootResult.shootTitle, status: shootResult.status };
  if (shootResult.reason === "expired") return shootResult;

  const meetingResult = await respondToMeetingInvite(token, response);
  if (meetingResult.ok) {
    return { ok: true, kind: "meeting", eventTitle: meetingResult.meetingTitle, status: meetingResult.status };
  }
  return meetingResult;
}
