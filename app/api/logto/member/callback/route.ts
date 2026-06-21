import { NextRequest, NextResponse } from "next/server";
import { assertLogtoConfigured, getLogtoClient } from "@/lib/services/auth-config";
import { createLocalLogtoSession, LOGTO_MEMBER_SESSION_COOKIE } from "@/lib/services/logto-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const logtoConfigError = assertLogtoConfigured();
  if (logtoConfigError) {
    return logtoConfigError;
  }

  const client = getLogtoClient();
  const logtoResponse = await client.handleSignInCallback(new URL("/console", request.url).toString())(request);

  try {
    const syntheticHeaders = new Headers();
    syntheticHeaders.set("cookie", request.headers.get("cookie") || "");
    const setCookies: string[] = typeof logtoResponse.headers.getSetCookie === "function" ? logtoResponse.headers.getSetCookie() : [];
    for (const sc of setCookies) {
      const match = sc.match(/^([^=]+)=([^;]*)/);
      if (match) {
        syntheticHeaders.append("cookie", `${match[1]}=${match[2]}`);
      }
    }

    const syntheticRequest = new NextRequest(new URL(request.url), { headers: syntheticHeaders });
    const context = await client.getLogtoContext(syntheticRequest, { fetchUserInfo: true, getAccessToken: false });
    if (context.isAuthenticated) {
      const subject = context.claims?.sub ?? null;
      const userInfo = (context.userInfo as Record<string, unknown> | undefined) ?? {};
      const email = typeof userInfo.email === "string" ? userInfo.email : undefined;
      const emailVerified = userInfo.email_verified === true;
      if (subject) {
        const session = await createLocalLogtoSession({
          surface: "member",
          subject,
          provider: "LOGTO",
          email: email ?? null,
          emailVerified,
          planId: request.cookies.get("polysmart_signup_plan")?.value ?? request.nextUrl.searchParams.get("plan"),
          billingCycle: request.cookies.get("polysmart_signup_billing_cycle")?.value ?? request.nextUrl.searchParams.get("billingCycle")
        });
        const response = NextResponse.redirect(new URL(logtoResponse.headers.get("Location") || "/console", request.url), { status: 307 });
        const sc = typeof logtoResponse.headers.getSetCookie === "function" ? logtoResponse.headers.getSetCookie() : [];
        for (const header of sc) {
          response.headers.append("Set-Cookie", header);
        }
        response.cookies.set(LOGTO_MEMBER_SESSION_COOKIE, session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: new Date(session.expiresAt)
        });
        response.cookies.delete("polysmart_signup_plan");
        response.cookies.delete("polysmart_signup_billing_cycle");
        return response;
      }
    }
  } catch {
    // Fall back to the original Logto response.
  }

  return logtoResponse;
}
