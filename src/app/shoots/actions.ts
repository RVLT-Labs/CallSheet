"use server";

import { revalidatePath } from "next/cache";

import { swapPlaceholderForMember } from "@/server/shoot-planning";
import { requireActiveOrganiserFilm } from "@/server/organiser";

export async function assignCrewToSlot(shootSlotId: string, membershipId: string) {
  await requireActiveOrganiserFilm();
  await swapPlaceholderForMember(shootSlotId, membershipId);
  revalidatePath("/shoots");
}
