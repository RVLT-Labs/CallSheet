"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type EmailCodeFlowProps = {
  callbackURL: string;
  invite?: InviteContext;
};

/**
 * Sign-in (style-board-v12 screen 1) and invite-landing (screen 2) — one flow,
 * since both collapse into the same email-code mechanism underneath. Sign-in
 * and invite-landing are genuinely different screens (invite leads with who
 * invited you and to what film), not the same form with swapped copy.
 */
export function EmailCodeFlow({ callbackURL, invite }: EmailCodeFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState(invite?.email ?? "");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setSending(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setSending(false);
    if (error) {
      setError("Something went wrong sending that code. Try again.");
      return;
    }
    setOtp("");
    setStep("code");
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setVerifying(false);
    if (error) {
      setError("That code isn't right or has expired. Try again.");
      return;
    }
    router.push(callbackURL);
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerify}>
        <div className="mb-7">
          <p className="font-display mb-1.5 text-center text-3xl font-bold italic text-burgundy">
            Callsheet
          </p>
          <p className="text-center text-[12.5px] leading-relaxed text-ink-soft">
            Enter the code we sent to
            <br />
            <strong className="text-ink">{email}</strong>
          </p>
        </div>

        <TextField
          label="Sign-in code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />

        {error && <p className="mb-3 text-[12.5px] text-burgundy">{error}</p>}

        <Button type="submit" variant="primary" disabled={verifying} className="mt-1.5 w-full">
          {verifying ? "Verifying…" : invite ? "Accept & continue" : "Sign in"}
        </Button>

        <p className="mt-5 text-center text-[12.5px] text-ink-soft">
          Didn&apos;t get it?{" "}
          <button type="button" onClick={sendCode} disabled={sending} className="font-semibold text-burgundy">
            Resend code
          </button>
        </p>
        <p className="mt-2 text-center text-[12.5px] text-ink-soft">
          <button type="button" onClick={() => setStep("form")} className="font-semibold text-ink-soft">
            Use a different email
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode}>
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
            Enter your email and we&apos;ll send you a sign-in code. No password needed.
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

      {error && <p className="mb-3 text-[12.5px] text-burgundy">{error}</p>}

      <Button type="submit" variant="primary" disabled={sending} className="mt-1.5 w-full">
        {sending ? "Sending…" : invite ? "Accept & continue" : "Send sign-in code"}
      </Button>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-faint">
        {invite
          ? "We'll email you a sign-in code for this address. Accepting logs you straight in."
          : "By continuing you agree to Callsheet's Terms & Privacy Policy."}
      </p>
    </form>
  );
}
