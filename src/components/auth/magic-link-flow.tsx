"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";

type InviteContext = {
  inviterName: string;
  filmName: string;
  role: string;
  email: string;
};

type MagicLinkFlowProps = {
  callbackURL: string;
  invite?: InviteContext;
};

/**
 * Sign-in (style-board-v12 screen 1), invite-landing (screen 2), and
 * check-your-email (screen 3) — one flow, since all three collapse into the
 * same magic-link mechanism underneath (design note in the mockup). Sign-in
 * and invite-landing are genuinely different screens (invite leads with who
 * invited you and to what film), not the same form with swapped copy.
 */
export function MagicLinkFlow({ callbackURL, invite }: MagicLinkFlowProps) {
  const [step, setStep] = useState<"form" | "sent" | "error">("form");
  const [email, setEmail] = useState(invite?.email ?? "");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL });
    setSending(false);
    setStep(error ? "error" : "sent");
  }

  async function handleResend() {
    setStep("form");
    await authClient.signIn.magicLink({ email, callbackURL });
    setStep("sent");
  }

  if (step === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-forest">
          <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-forest" fill="none" strokeWidth={1.8}>
            <path d="M4 6.5l8 6.5 8-6.5" />
            <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
          </svg>
        </div>
        <h1 className="mb-1.5 text-center text-base font-bold">Check your email</h1>
        <p className="mb-7 text-center text-[12.5px] leading-relaxed text-ink-soft">
          We sent a sign-in link to
          <br />
          <strong className="text-ink">{email}</strong>
        </p>
        <a
          href="mailto:"
          className="block rounded-md border border-hairline py-[13px] text-center text-[13.5px] font-semibold text-ink-soft"
        >
          Open email app
        </a>
        <p className="mt-5 text-center text-[12.5px] text-ink-soft">
          Didn&apos;t get it?{" "}
          <button type="button" onClick={handleResend} className="font-semibold text-burgundy">
            Resend link
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {invite ? (
        <div className="mb-7 text-center">
          <div className="mb-3 flex justify-center">
            <Avatar name={invite.inviterName} size="lg" />
          </div>
          <p className="text-[13.5px] text-ink-soft">{invite.inviterName} invited you to join</p>
          <p className="font-display my-1 text-2xl italic text-burgundy">{invite.filmName}</p>
          <p className="text-[13.5px] capitalize text-ink-soft">{invite.role}</p>
        </div>
      ) : (
        <div className="mb-7">
          <p className="font-display mb-1.5 text-center text-3xl font-bold italic text-burgundy">
            Callsheet
          </p>
          <p className="text-center text-[12.5px] leading-relaxed text-ink-soft">
            Enter your email and we&apos;ll send you a link to sign in. No password needed.
          </p>
        </div>
      )}

      <TextField
        label="Email"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {step === "error" && (
        <p className="mb-3 text-[12.5px] text-burgundy">
          Something went wrong sending that link. Try again.
        </p>
      )}

      <Button type="submit" variant="primary" disabled={sending} className="mt-1.5 w-full">
        {sending ? "Sending…" : invite ? "Accept & continue" : "Send sign-in link"}
      </Button>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-faint">
        {invite
          ? "We'll send a sign-in link to this address. Accepting logs you straight in."
          : "By continuing you agree to Callsheet's Terms & Privacy Policy."}
      </p>
    </form>
  );
}
