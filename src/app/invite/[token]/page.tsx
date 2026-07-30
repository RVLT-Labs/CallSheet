import { CenteredCard } from "@/components/ui/centered-card";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { getInviteByToken } from "@/server/shoot-invite-email";

const STATUS_TONE = { accepted: "forest", declined: "burgundy", pending: "taupe" } as const;
const STATUS_LABEL = { accepted: "Accepted", declined: "Declined", pending: "Pending" } as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite.ok) {
    return (
      <CenteredCard>
        <p className="mb-2 text-base font-bold">
          {invite.reason === "expired" ? "This invite link has expired" : "This invite link isn't valid"}
        </p>
        <p className="text-sm text-ink-soft">
          Ask whoever&apos;s organising the shoot to send you a fresh link.
        </p>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      <p className="font-display mb-1 text-xl font-bold italic text-burgundy">{invite.shootTitle}</p>
      <p className="mb-6 text-sm text-ink-soft">Hi {invite.recipientName}, here&apos;s your invite.</p>

      <div className="mb-6">
        <StatusDot tone={STATUS_TONE[invite.status]} label={STATUS_LABEL[invite.status]} />
      </div>

      <div className="flex gap-3">
        <Button href={`/invite/${token}/accept`} variant="primary" className="flex-1 text-center">
          Accept
        </Button>
        <Button href={`/invite/${token}/decline`} variant="secondary" className="flex-1 text-center">
          Decline
        </Button>
      </div>
    </CenteredCard>
  );
}
