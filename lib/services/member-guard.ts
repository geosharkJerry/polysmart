import { NextRequest, NextResponse } from "next/server";
import { getMemberByTokenAsync, MEMBER_SESSION_COOKIE, resolveMemberToken } from "@/lib/services/member-auth";
import { getMemberByLogtoSessionToken, LOGTO_MEMBER_SESSION_COOKIE } from "@/lib/services/logto-session";

export async function requireMemberSession(
  request: NextRequest,
  options?: { userId?: string; requireVerified?: boolean }
) {
  const logtoCookieToken = request.cookies.get(LOGTO_MEMBER_SESSION_COOKIE)?.value ?? null;
  const authHeader = request.headers.get("authorization");
  const legacyCookieToken = request.cookies.get(MEMBER_SESSION_COOKIE)?.value ?? null;
  const token = resolveMemberToken(authHeader, logtoCookieToken ?? legacyCookieToken);
  if (!token) {
    return { user: null, token: null, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) } as const;
  }

  const isBearerToken = Boolean(authHeader?.startsWith("Bearer "));
  const isBrowserCookieSession = Boolean(!isBearerToken && (logtoCookieToken || legacyCookieToken));

  let user = null;
  if (isBrowserCookieSession) {
    user = await getMemberByLogtoSessionToken(token);
    if (!user) {
      return {
        user: null,
        token: null,
        response: NextResponse.json(
          {
            message: "Legacy browser sessions are disabled. Please sign in again with Logto."
          },
          { status: 401 }
        )
      } as const;
    }
  } else {
    user = await getMemberByTokenAsync(token) ?? await getMemberByLogtoSessionToken(token);
  }

  if (!user) {
    return { user: null, token: null, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (options?.requireVerified !== false && !user.emailVerifiedAt) {
    return { user: null, token: null, response: NextResponse.json({ message: "Email verification required" }, { status: 403 }) } as const;
  }
  if (options?.userId && user.userId !== options.userId) {
    return { user: null, token: null, response: NextResponse.json({ message: "Forbidden" }, { status: 403 }) } as const;
  }

  return { user, token, response: null } as const;
}
