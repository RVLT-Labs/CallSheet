"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type PasskeySignInProps = {
  callbackURL: string;
};

/**
 * Fast path for returning users on a recognized device — sits above the
 * email-code form on the plain sign-in screen. Not shown on the invite-landing
 * screen: a first-time invitee has no passkey registered yet, and the invite
 * copy there is built around "who invited you", not a generic sign-in choice.
 */
export function PasskeySignIn({ callbackURL }: PasskeySignInProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.passkey();
    setPending(false);
    if (error) {
      setError("Couldn't sign in with a passkey. Use your email instead.");
      return;
    }
    router.push(callbackURL);
  }

  return (
    <div className="mb-6">
      <Button type="button" variant="secondary" disabled={pending} onClick={handleClick} className="w-full">
        {pending ? "Waiting for passkey…" : "Sign in with a passkey"}
      </Button>
      {error && <p className="mt-2 text-center text-[12.5px] text-burgundy">{error}</p>}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-[11px] uppercase tracking-wide text-ink-faint">or</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}
