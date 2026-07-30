import { createAuthClient } from "better-auth/react";
import { organizationClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Omit baseURL when NEXT_PUBLIC_BETTER_AUTH_URL isn't set so Better Auth falls
  // back to the current origin — a hardcoded localhost:3000 fallback here would
  // make production builds call the local dev server and get a CORS rejection.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [organizationClient(), magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;
