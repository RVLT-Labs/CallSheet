import { createAuthClient } from "better-auth/react";
import { organizationClient, emailOTPClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  // Omit baseURL when NEXT_PUBLIC_BETTER_AUTH_URL isn't set so Better Auth falls
  // back to the current origin — a hardcoded localhost:3000 fallback here would
  // make production builds call the local dev server and get a CORS rejection.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [organizationClient(), emailOTPClient(), passkeyClient()],
});

export const { signIn, signOut, useSession } = authClient;
