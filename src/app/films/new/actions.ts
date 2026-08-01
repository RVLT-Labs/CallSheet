"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const priorMemberships = await prisma.member.count({ where: { userId: session.user.id } });

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

  // First film ever = onboarding done, whether this ran from the self-signup
  // welcome flow or the regular "create a new film" entry point.
  if (priorMemberships === 0) {
    await prisma.user.update({ where: { id: session.user.id }, data: { onboardedAt: new Date() } });
  }

  // The organiser is auto-added as the "owner" member above, so inviting their
  // own address here would be rejected by better-auth as already-a-member —
  // silently skip it rather than surfacing that as a confusing invite failure.
  const ownEmail = session.user.email.toLowerCase();
  const invitesToSend = input.invites.filter((invite) => invite.email.toLowerCase() !== ownEmail);

  // Invites are best-effort (the wizard copy says "you can skip this and invite
  // later"): a single failure — e.g. a transient email-provider error, or an
  // invite better-auth rejects for a domain reason (already a member, already
  // invited) — must not wipe out the film that was just created, or leave the
  // organiser stuck on this step with no way forward. Collect failures instead
  // of throwing.
  const failedInvites: string[] = [];
  for (const invite of invitesToSend) {
    try {
      await auth.api.createInvitation({
        headers: requestHeaders,
        body: {
          email: invite.email,
          role: "member",
          organizationId: organization.id,
          roleTags: invite.role ? [invite.role] : [],
        },
      });
    } catch (err) {
      console.error(`Failed to invite ${invite.email} to ${organization.id}:`, err);
      failedInvites.push(invite.email);
    }
  }

  return {
    filmId: organization.id,
    filmName: organization.name,
    invitedCount: invitesToSend.length - failedInvites.length,
    failedInvites,
  };
}
