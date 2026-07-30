import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";
import { sendPlainEmail } from "@/lib/email";

// Films are modelled as Better Auth Organizations, crew as Members, per spec §4.1.
// Organiser = org owner/admin, crew = org member — Better Auth's default roles map
// directly onto the spec's two auth roles, so no custom access-control setup is needed.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Email-only, no passwords (spec §4.1) — the magic-link plugin below is the only
  // sign-in method. There is no separate first-party session here to protect.
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
    },
  },

  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendPlainEmail({
          to: email,
          subject: "Your Callsheet sign-in link",
          html: `<p>Tap below to sign in to Callsheet.</p><p><a href="${url}">Sign in</a></p><p>This link expires shortly and only works once.</p>`,
        });
      },
    }),
    organization({
      schema: {
        organization: {
          additionalFields: {
            company: { type: "string", required: false },
            dateRangeStart: { type: "date", required: false },
            dateRangeEnd: { type: "date", required: false },
            posterUrl: { type: "string", required: false },
            status: { type: "string", required: false, defaultValue: "active" },
            showTentativeToCrew: { type: "boolean", required: false, defaultValue: false },
            showCrewContactsToCrew: { type: "boolean", required: false, defaultValue: false },
            showAvailabilityToCrew: { type: "boolean", required: false, defaultValue: false },
          },
        },
        member: {
          additionalFields: {
            roleTags: { type: "string[]", required: false, defaultValue: [] },
          },
        },
        invitation: {
          additionalFields: {
            // Pre-assigned role tags (spec §4.2). Better Auth's acceptInvitation
            // only copies organizationId/userId/role onto the new Member, so the
            // hook below carries this across explicitly.
            roleTags: { type: "string[]", required: false, defaultValue: [] },
          },
        },
      },
      sendInvitationEmail: async (data) => {
        const url = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/accept-invitation/${data.id}`;
        await sendPlainEmail({
          to: data.email,
          subject: `You've been added to crew on ${data.organization.name}`,
          html: `<p>${data.inviter.user.name} added you to crew on <strong>${data.organization.name}</strong> on Callsheet.</p><p><a href="${url}">Set your availability</a></p>`,
        });
      },
      organizationHooks: {
        afterAcceptInvitation: async ({ invitation, member }) => {
          const roleTags = (invitation as { roleTags?: string[] }).roleTags;
          if (roleTags?.length) {
            await prisma.member.update({ where: { id: member.id }, data: { roleTags } });
          }
        },
      },
    }),
    // Must be last: writes the session cookie via Next.js's cookies() API.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
