import { betterAuth, getBaseURL } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email";
import { renderMagicLinkEmail, renderCrewInvitationEmail } from "@/lib/email-templates";

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
        const { subject, html, text } = renderMagicLinkEmail({ url });
        await sendTemplatedEmail({ to: email, subject, html, text });
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
        // getBaseURL() resolves the same way Better Auth resolves its own baseURL
        // (BETTER_AUTH_URL env, then related conventions) — a hardcoded localhost
        // fallback here would silently break invitation links in any deploy that
        // doesn't set it, same failure mode as the sign-in CORS bug. Fail loudly
        // instead of emailing a broken link if it's genuinely unconfigured.
        const baseURL = getBaseURL();
        if (!baseURL) {
          throw new Error(
            "BETTER_AUTH_URL is not set — cannot build an invitation link.",
          );
        }
        const url = `${baseURL}/accept-invitation/${data.id}`;
        // roleTags is an additionalField on the invitation schema (registered below),
        // not part of better-auth's base Invitation type — same cast pattern as
        // afterAcceptInvitation below.
        const roleTags = (data.invitation as { roleTags?: string[] }).roleTags;
        const { subject, html, text } = renderCrewInvitationEmail({
          inviterName: data.inviter.user.name,
          filmName: data.organization.name,
          roleTag: roleTags?.[0] ?? null,
          url,
        });
        await sendTemplatedEmail({ to: data.email, subject, html, text });
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
