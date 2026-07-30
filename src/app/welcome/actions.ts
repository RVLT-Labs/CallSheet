"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveOnboardingName(name: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  await prisma.user.update({ where: { id: session.user.id }, data: { name: trimmed } });
}
