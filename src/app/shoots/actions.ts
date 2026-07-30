"use server";

import { revalidatePath } from "next/cache";

import { requireActiveMembership } from "@/server/availability";
import { respondAsMember } from "@/server/my-shoots";
import { swapPlaceholderForMember } from "@/server/shoot-planning";
import { requireActiveOrganiserFilm } from "@/server/organiser";

export async function assignCrewToSlot(shootSlotId: string, membershipId: string) {
  await requireActiveOrganiserFilm();
  await swapPlaceholderForMember(shootSlotId, membershipId);
  revalidatePath("/shoots");
}

export async function respondToInviteAction(inviteId: string, response: "accepted" | "declined") {
  const { membershipId } = await requireActiveMembership();
  await respondAsMember(inviteId, membershipId, response);
  revalidatePath("/shoots");
}

export async function acceptAllInvitesAction(inviteIds: string[]) {
  const { membershipId } = await requireActiveMembership();
  await Promise.all(inviteIds.map((id) => respondAsMember(id, membershipId, "accepted")));
  revalidatePath("/shoots");
}
