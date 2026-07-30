import Link from "next/link";

import { getInvitationPreview } from "@/server/invitations";

import { AcceptInvitationClient } from "./accept-invitation-client";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invitation = await getInvitationPreview(id);

  if (!invitation || !invitation.isPending) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-bold">This invite link isn&apos;t valid anymore</p>
        <p className="max-w-xs text-sm text-ink-soft">
          Ask whoever invited you to send a new one, or sign in if you already have an account.
        </p>
        <Link href="/sign-in" className="mt-2 text-[13px] font-semibold text-burgundy">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <AcceptInvitationClient
      invitationId={invitation.id}
      inviterName={invitation.inviterName}
      filmName={invitation.filmName}
      role={invitation.role}
      email={invitation.email}
    />
  );
}
