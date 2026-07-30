"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { CenteredCard } from "@/components/ui/centered-card";
import { MagicLinkFlow } from "@/components/auth/magic-link-flow";
import { authClient, useSession } from "@/lib/auth-client";

type Props = {
  invitationId: string;
  inviterName: string;
  filmName: string;
  role: string;
  email: string;
};

/**
 * Accepting the invite logs the person straight in (spec §4.1): once the
 * magic-link click authenticates them back on this same page, this effect
 * finishes the job by accepting the invitation and dropping them at home.
 */
export function AcceptInvitationClient({ invitationId, inviterName, filmName, role, email }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const accepted = useRef(false);

  useEffect(() => {
    if (!session?.user || accepted.current) return;
    if (session.user.email.toLowerCase() !== email.toLowerCase()) return;

    accepted.current = true;
    authClient.organization.acceptInvitation({ invitationId }).then(() => {
      router.push("/");
    });
  }, [session, email, invitationId, router]);

  return (
    <CenteredCard>
      <MagicLinkFlow
        callbackURL={`/accept-invitation/${invitationId}`}
        invite={{ inviterName, filmName, role, email }}
      />
    </CenteredCard>
  );
}
