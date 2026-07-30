"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type CreateFilmInvite = { email: string; role?: string };

export type CreateFilmInput = {
  title: string;
  company: string;
  dateStart: string;
  dateEnd: string;
  posterUrl: string;
  invites: CreateFilmInvite[];
};

export async function createFilm(input: CreateFilmInput) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) throw new Error("Not authenticated");

  if (!input.title.trim()) throw new Error("Title is required");

  const organization = await auth.api.createOrganization({
    headers: requestHeaders,
    body: {
      name: input.title.trim(),
      slug: slugify(input.title),
      company: input.company.trim() || undefined,
      dateRangeStart: input.dateStart ? new Date(input.dateStart) : undefined,
      dateRangeEnd: input.dateEnd ? new Date(input.dateEnd) : undefined,
      posterUrl: input.posterUrl.trim() || undefined,
    },
  });

  if (!organization) throw new Error("Could not create film");

  for (const invite of input.invites) {
    await auth.api.createInvitation({
      headers: requestHeaders,
      body: {
        email: invite.email,
        role: "member",
        organizationId: organization.id,
        roleTags: invite.role ? [invite.role] : [],
      },
    });
  }

  return { filmId: organization.id, filmName: organization.name, invitedCount: input.invites.length };
}
