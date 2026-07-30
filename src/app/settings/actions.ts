"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireActiveOrganiser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new Error("No active film");

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
  });
  if (!membership || membership.role === "member") throw new Error("Organisers only");

  return { session, organizationId };
}

export async function saveFilmSettings(formData: FormData) {
  const { organizationId } = await requireActiveOrganiser();

  const title = String(formData.get("title") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const dateStart = String(formData.get("dateStart") ?? "");
  const dateEnd = String(formData.get("dateEnd") ?? "");

  if (!title) throw new Error("Title is required");

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: title,
      company: company || null,
      dateRangeStart: dateStart ? new Date(dateStart) : null,
      dateRangeEnd: dateEnd ? new Date(dateEnd) : null,
      showTentativeToCrew: formData.get("showTentativeToCrew") === "on",
      showCrewContactsToCrew: formData.get("showCrewContactsToCrew") === "on",
      showAvailabilityToCrew: formData.get("showAvailabilityToCrew") === "on",
    },
  });

  revalidatePath("/settings");
}

export async function wrapFilm() {
  const { organizationId } = await requireActiveOrganiser();
  await prisma.organization.update({ where: { id: organizationId }, data: { status: "wrapped" } });
  revalidatePath("/settings");
  redirect("/wrapped");
}

export async function reactivateFilm() {
  const { organizationId } = await requireActiveOrganiser();
  await prisma.organization.update({ where: { id: organizationId }, data: { status: "active" } });
  revalidatePath("/settings");
}

export async function addOrganiser(formData: FormData) {
  const { organizationId } = await requireActiveOrganiser();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) throw new Error("Email is required");

  const requestHeaders = await headers();
  await auth.api.createInvitation({
    headers: requestHeaders,
    body: { email, role: "owner", organizationId },
  });

  revalidatePath("/settings");
}

export async function addCrewMember(formData: FormData) {
  const { organizationId } = await requireActiveOrganiser();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) throw new Error("Email is required");
  const role = String(formData.get("role") ?? "").trim();

  const requestHeaders = await headers();
  await auth.api.createInvitation({
    headers: requestHeaders,
    body: { email, role: "member", organizationId, roleTags: role ? [role] : [] },
  });

  revalidatePath("/settings");
}

export async function removeCrewMember(formData: FormData) {
  const { organizationId } = await requireActiveOrganiser();
  const memberId = String(formData.get("memberId") ?? "").trim();
  if (!memberId) throw new Error("Crew member is required");

  const requestHeaders = await headers();
  await auth.api.removeMember({
    headers: requestHeaders,
    body: { memberIdOrEmail: memberId, organizationId },
  });

  revalidatePath("/settings");
}
