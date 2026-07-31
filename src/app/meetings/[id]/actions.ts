"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganiserFilm } from "@/server/organiser";
import {
  confirmMeeting as confirmMeetingDetail,
  nudgeInvite,
  overrideInviteStatus,
  removePersonFromMeeting,
  setStartTimeOverride,
  updateMeetingDetails,
} from "@/server/meeting-detail";
import type { InviteStatus } from "@/server/invite-roster";

export async function confirmMeetingAction(meetingId: string) {
  const { organizationId } = await requireActiveOrganiserFilm();
  await confirmMeetingDetail(meetingId, organizationId);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function updateMeetingDetailsAction(
  meetingId: string,
  data: {
    title?: string;
    locationAddress?: string;
    locationPlaceId?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationMapUrl?: string;
    locationNotes?: string;
    notes?: string;
    dayStartTimes?: { dayId: string; defaultStartTime: string }[];
  },
) {
  const { organizationId } = await requireActiveOrganiserFilm();
  await updateMeetingDetails(meetingId, organizationId, data);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function nudgeInviteAction(meetingId: string, inviteId: string) {
  await requireActiveOrganiserFilm();
  await nudgeInvite(inviteId);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function removePersonAction(meetingId: string, membershipId: string) {
  await requireActiveOrganiserFilm();
  await removePersonFromMeeting(meetingId, membershipId);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function overrideInviteStatusAction(meetingId: string, inviteId: string, status: InviteStatus) {
  const { organizationId, membership } = await requireActiveOrganiserFilm();
  await overrideInviteStatus(meetingId, organizationId, inviteId, status, membership.id);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function setStartTimeOverrideAction(
  meetingId: string,
  inviteId: string,
  meetingDayId: string,
  startTime: string,
) {
  await requireActiveOrganiserFilm();
  await setStartTimeOverride(inviteId, meetingDayId, startTime);
  revalidatePath(`/meetings/${meetingId}`);
}
