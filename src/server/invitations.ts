import { prisma } from "@/lib/prisma";

/**
 * Minimal, safe-to-show-before-auth invitation preview (inviter name, film
 * name, role) for the invite-landing screen. Better Auth's own
 * `getInvitation` endpoint requires a session, which doesn't exist yet at
 * this point in the flow, so this reads directly via Prisma instead.
 * Deliberately does not select anything beyond what the invite-landing
 * screen shows — no organization settings, no member list.
 */
export async function getInvitationPreview(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: { select: { name: true } },
      inviterId: true,
    },
  });

  if (!invitation) return null;

  const inviter = await prisma.user.findUnique({
    where: { id: invitation.inviterId },
    select: { name: true },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role ?? "member",
    isPending: invitation.status === "pending" && invitation.expiresAt > new Date(),
    filmName: invitation.organization.name,
    inviterName: inviter?.name ?? "Someone",
  };
}
