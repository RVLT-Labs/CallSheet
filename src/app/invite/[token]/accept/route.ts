import { NextRequest, NextResponse } from "next/server";

import { respondToInviteByToken } from "@/server/invite-lookup";

/** No-login Accept, clicked straight from the invite email (spec §7, issue #10 acceptance criteria). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await respondToInviteByToken(token, "accepted");
  return NextResponse.redirect(new URL(`/invite/${token}`, request.url));
}
