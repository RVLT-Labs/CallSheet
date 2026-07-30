"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveProfile(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const roleTags = formData.getAll("roleTags").map(String);

  if (!name) throw new Error("Name is required");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, phone: phone || null },
  });

  const activeOrganizationId = session.session.activeOrganizationId;
  if (activeOrganizationId) {
    await prisma.member.update({
      where: { organizationId_userId: { organizationId: activeOrganizationId, userId: session.user.id } },
      data: { roleTags },
    });
  }

  revalidatePath("/profile");
}
