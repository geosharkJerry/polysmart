import { NextRequest, NextResponse } from "next/server";
import { requireMemberSession } from "@/lib/services/member-guard";
import { completeMemberProfileAsync, memberProfileIsComplete } from "@/lib/services/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMemberSession(request, { requireVerified: false });
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ user: auth.user, profileComplete: memberProfileIsComplete(auth.user) });
}

export async function PUT(request: NextRequest) {
  const auth = await requireMemberSession(request, { requireVerified: false });
  if (auth.response) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await completeMemberProfileAsync(auth.user.userId, {
    fullName: String(payload.fullName || ""),
    country: String(payload.country || ""),
    address: String(payload.address || ""),
    investorTier: String(payload.investorTier || "retail") as "retail" | "professional" | "institutional",
    acceptedRegistrationTerms: Boolean(payload.acceptedRegistrationTerms)
  });

  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
