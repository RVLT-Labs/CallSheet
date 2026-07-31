"use server";

import { revalidatePath } from "next/cache";

import { requireActiveMembership } from "@/server/availability";
import { respondAsMember } from "@/server/my-meetings";
import { swapPlaceholderForMember } from "@/server/meeting-planning";
import { requireActiveOrganiserFilm } from "@/server/organiser";

export async function assignCrewToSlot(meetingSlotId: string, membershipId: string) {
  await requireActiveOrganiserFilm();
  await swapPlaceholderForMember(meetingSlotId, membershipId);
  revalidatePath("/meetings");
}

export async function respondToInviteAction(inviteId: string, response: "accepted" | "declined") {
  const { membershipId } = await requireActiveMembership();
  await respondAsMember(inviteId, membershipId, response);
  revalidatePath("/meetings");
}

export async function acceptAllInvitesAction(inviteIds: string[]) {
  const { membershipId } = await requireActiveMembership();
  await Promise.all(inviteIds.map((id) => respondAsMember(id, membershipId, "accepted")));
  revalidatePath("/meetings");
}
