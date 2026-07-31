"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganiserFilm } from "@/server/organiser";
import {
  confirmShoot as confirmShootDetail,
  nudgeInvite,
  removePersonFromShoot,
  setCallTimeOverride,
  updateShootDetails,
} from "@/server/shoot-detail";

export async function confirmShootAction(shootId: string) {
  const { organizationId } = await requireActiveOrganiserFilm();
  await confirmShootDetail(shootId, organizationId);
  revalidatePath(`/shoots/${shootId}`);
}

export async function updateShootDetailsAction(
  shootId: string,
  data: {
    title?: string;
    locationAddress?: string;
    locationPlaceId?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationMapUrl?: string;
    locationNotes?: string;
    notes?: string;
    dayCallTimes?: { dayId: string; defaultCallTime: string }[];
  },
) {
  const { organizationId } = await requireActiveOrganiserFilm();
  await updateShootDetails(shootId, organizationId, data);
  revalidatePath(`/shoots/${shootId}`);
}

export async function nudgeInviteAction(shootId: string, inviteId: string) {
  await requireActiveOrganiserFilm();
  await nudgeInvite(inviteId);
  revalidatePath(`/shoots/${shootId}`);
}

export async function removePersonAction(shootId: string, membershipId: string) {
  await requireActiveOrganiserFilm();
  await removePersonFromShoot(shootId, membershipId);
  revalidatePath(`/shoots/${shootId}`);
}

export async function setCallTimeOverrideAction(
  shootId: string,
  inviteId: string,
  shootDayId: string,
  callTime: string,
) {
  await requireActiveOrganiserFilm();
  await setCallTimeOverride(inviteId, shootDayId, callTime);
  revalidatePath(`/shoots/${shootId}`);
}
