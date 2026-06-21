import { NextRequest, NextResponse } from "next/server";
import { getAuthConfigurationStatus, getLogtoClient } from "@/lib/services/auth-config";
import { LOGTO_MEMBER_SESSION_COOKIE } from "@/lib/services/logto-session";
import { MEMBER_SESSION_COOKIE } from "@/lib/services/member-auth";

export async function POST(request: NextRequest) {
  const authConfig = getAuthConfigurationStatus();
  let nextResponse: NextResponse;
  if (authConfig.logto.configured) {
    const response = await getLogtoClient().handleSignOut(new URL("/", request.url).toString())(request);
    nextResponse = new NextResponse(response.body, response);
  } else {
    nextResponse = NextResponse.json({ ok: true, mode: "local-session-only" });
  }
  nextResponse.cookies.delete(LOGTO_MEMBER_SESSION_COOKIE);
  nextResponse.cookies.delete(MEMBER_SESSION_COOKIE);
  return nextResponse;
}
