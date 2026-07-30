import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isInviteDueForReminder } from "@/server/shoot-roster";
import { sendReminderEmail } from "@/server/shoot-invite-email";

/**
 * Scans for Pending invites due a reminder (issue #10 acceptance criteria)
 * and sends exactly one each. Wrapped films are excluded — wrapping stops
 * nudges/reminders without touching historical data (cross-cutting rule,
 * issue #23). Scheduled by vercel.json; guarded by CRON_SECRET so this isn't
 * a public trigger for spamming crew.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await prisma.shootInvite.findMany({
    where: { status: "pending", sentAt: { not: null }, lastReminderSentAt: null, shoot: { film: { status: { not: "wrapped" } } } },
    select: { id: true, status: true, sentAt: true, lastReminderSentAt: true },
  });

  const now = new Date();
  const due = candidates.filter((invite) => isInviteDueForReminder(invite, now));

  await Promise.all(due.map((invite) => sendReminderEmail(invite.id)));

  return NextResponse.json({ remindersSent: due.length });
}
