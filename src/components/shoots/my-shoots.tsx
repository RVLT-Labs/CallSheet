"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { acceptAllInvitesAction, respondToInviteAction } from "@/app/shoots/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { StatusDot } from "@/components/ui/status-dot";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import { needsStickyAcceptAllFooter, splitSoonestPending } from "@/lib/my-shoots-rules";
import type { MyShoot } from "@/server/my-shoots";

const INVITE_TONE = { accepted: "forest", declined: "burgundy", pending: "taupe" } as const;
const INVITE_LABEL = { accepted: "Accepted", declined: "Declined", pending: "Pending" } as const;

function dateLabel(dateIsos: string[]) {
  if (dateIsos.length === 0) return "No date set";
  if (dateIsos.length === 1) return dateIsos[0];
  return `${dateIsos[0]} – ${dateIsos[dateIsos.length - 1]}`;
}

export function MyShoots({ pending, upcoming, past }: { pending: MyShoot[]; upcoming: MyShoot[]; past: MyShoot[] }) {
  const { soonest, rest } = splitSoonestPending(pending);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [pending_, startTransition] = useTransition();

  function respond(inviteId: string, response: "accepted" | "declined") {
    startTransition(() => respondToInviteAction(inviteId, response));
  }

  function acceptAll() {
    const ids = pending.map((s) => s.inviteId).filter((id): id is string => Boolean(id));
    startTransition(async () => {
      await acceptAllInvitesAction(ids);
      setSheetOpen(false);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display mb-6 text-2xl font-bold italic text-burgundy">My Shoots</h1>

      {soonest && (
        <Card>
          <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Needs your response</p>
          <p className="mb-1 text-[15px] font-semibold">{soonest.title ?? "Shoot"}</p>
          <p className="mb-4 text-[13px] text-ink-soft">{dateLabel(soonest.dateIsos)}</p>
          <div className="flex gap-3">
            <Button
              variant="primary"
              disabled={pending_}
              onClick={() => soonest.inviteId && respond(soonest.inviteId, "accepted")}
              className="flex-1"
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              disabled={pending_}
              onClick={() => soonest.inviteId && respond(soonest.inviteId, "declined")}
              className="flex-1"
            >
              Decline
            </Button>
          </div>

          {rest.length > 0 && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="-mx-4 -mb-4 mt-4 flex w-[calc(100%+2rem)] items-center justify-between rounded-b-md border-t border-hairline bg-cream-deep px-4 py-2.5 text-[12.5px] font-semibold text-ink-soft"
            >
              +{rest.length} more waiting on you
              <ChevronRightIcon className="h-4 w-4 stroke-ink-soft" />
            </button>
          )}
        </Card>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Needs your response">
        <div className="max-h-[60vh] overflow-y-auto">
          {rest.map((shoot) => (
            <div key={shoot.id} className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0">
              <div>
                <p className="text-[13.5px] font-medium">{shoot.title ?? "Shoot"}</p>
                <p className="text-[12px] text-ink-soft">{dateLabel(shoot.dateIsos)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending_}
                  onClick={() => shoot.inviteId && respond(shoot.inviteId, "accepted")}
                  className="text-[12px] font-semibold text-forest"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={pending_}
                  onClick={() => shoot.inviteId && respond(shoot.inviteId, "declined")}
                  className="text-[12px] font-semibold text-burgundy"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
        {needsStickyAcceptAllFooter(pending.length) && (
          <StickyFooterAction>
            <Button variant="primary" disabled={pending_} onClick={acceptAll} className="w-full">
              Accept all
            </Button>
          </StickyFooterAction>
        )}
      </Sheet>

      <div className="mt-8">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Upcoming</p>
        {upcoming.length === 0 && <p className="text-[13px] text-ink-soft">Nothing scheduled yet.</p>}
        {upcoming.map((shoot) => (
          <Link
            key={shoot.id}
            href={`/shoots/${shoot.id}`}
            className="flex items-center justify-between border-b border-hairline py-3 text-left last:border-b-0"
          >
            <div>
              <p className="text-[13.5px] font-medium">{shoot.title ?? "Shoot"}</p>
              <p className="text-[12px] text-ink-soft">{dateLabel(shoot.dateIsos)}</p>
            </div>
            {shoot.status === "tentative" ? (
              <span className="text-[12px] italic text-terracotta">Hold, not booked</span>
            ) : shoot.inviteStatus ? (
              <StatusDot tone={INVITE_TONE[shoot.inviteStatus]} label={INVITE_LABEL[shoot.inviteStatus]} />
            ) : null}
          </Link>
        ))}
      </div>

      {past.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setPastOpen((o) => !o)}
            className="text-[12.5px] font-semibold text-ink-soft"
          >
            {pastOpen ? "Hide" : "Show"} past ({past.length})
          </button>
          {pastOpen &&
            past.map((shoot) => (
              <div key={shoot.id} className="flex items-center justify-between border-b border-hairline py-3 text-ink-faint">
                <div>
                  <p className="text-[13.5px]">{shoot.title ?? "Shoot"}</p>
                  <p className="text-[12px]">{dateLabel(shoot.dateIsos)}</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
