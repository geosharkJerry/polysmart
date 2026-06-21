import { NextRequest, NextResponse } from "next/server";
import { requireMemberSession } from "@/lib/services/member-guard";
import { memberProfileIsComplete } from "@/lib/services/users";

export async function GET(request: NextRequest) {
  const auth = await requireMemberSession(request, { requireVerified: false });
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ user: auth.user, profileComplete: memberProfileIsComplete(auth.user) });
}
