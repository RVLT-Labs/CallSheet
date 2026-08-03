import { betterAuth, getBaseURL } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins/email-otp";
import { passkey } from "@better-auth/passkey";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email";
import { renderEmailCodeEmail, renderCrewInvitationEmail } from "@/lib/email-templates";

// getBaseURL() resolves the same way Better Auth resolves its own baseURL
// (BETTER_AUTH_URL env, then related conventions). The passkey plugin needs its
// rpID (the WebAuthn relying party ID — the site's bare hostname) up front, so
// resolve it eagerly and fail loudly if unconfigured rather than registering
// passkeys against the wrong origin.
const baseURL = getBaseURL(undefined, "/");
if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is not set — cannot configure auth.");
}
const rpID = new URL(baseURL).hostname;

// Films are modelled as Better Auth Organizations, crew as Members, per spec §4.1.
// Organiser = org owner/admin, crew = org member — Better Auth's default roles map
// directly onto the spec's two auth roles, so no custom access-control setup is needed.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Email-only, no passwords (spec §4.1) — email code is the universal sign-in
  // method, passkey is the fast path for returning users on a recognized device.
  // There is no separate first-party session here to protect.
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
    },
  },

  // Without this, auth.api.getSession() hits the Session table on every
  // server-rendered page/action — a signed, short-lived cookie cache avoids
  // that DB round trip for most requests while still re-validating every 5m.
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  plugins: [
    emailOTP({
      // Only used for sign-in (and, transitively, first-time sign-up — the app
      // has no password reset or email-change flows to cover the other types).
      sendVerificationOTP: async ({ email, otp }) => {
        const { subject, html, text } = renderEmailCodeEmail({ otp });
        await sendTemplatedEmail({ to: email, subject, html, text });
      },
    }),
    passkey({ rpID, rpName: "Callsheet" }),
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
        const baseURL = getBaseURL(undefined, "/");
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
          roleTags: roleTags ?? [],
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
