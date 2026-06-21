import { NextRequest, NextResponse } from "next/server";
import { assertLogtoConfigured, getLogtoClient } from "@/lib/services/auth-config";
import { SUPER_ADMIN_EMAIL } from "@/lib/services/admin-auth";
import { createLocalLogtoSession, LOGTO_ADMIN_SESSION_COOKIE } from "@/lib/services/logto-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const logtoConfigError = assertLogtoConfigured();
  if (logtoConfigError) {
    return logtoConfigError;
  }

  const client = getLogtoClient();
  const logtoResponse = await client.handleSignInCallback(new URL("/admin", request.url).toString())(request);

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
      const email = (context.userInfo as Record<string, unknown> | undefined)?.email as string | undefined;
      const normalizedEmail = (email ?? "").trim().toLowerCase();
      if (subject && normalizedEmail === SUPER_ADMIN_EMAIL) {
        const session = await createLocalLogtoSession({ surface: "admin", subject, provider: "LOGTO", email: normalizedEmail });
        const response = NextResponse.redirect(new URL(logtoResponse.headers.get("Location") || "/admin", request.url), { status: 307 });
        const sc = typeof logtoResponse.headers.getSetCookie === "function" ? logtoResponse.headers.getSetCookie() : [];
        for (const header of sc) {
          response.headers.append("Set-Cookie", header);
        }
        response.cookies.set(LOGTO_ADMIN_SESSION_COOKIE, session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: new Date(session.expiresAt)
        });
        return response;
      }

      if (subject) {
        const unauthorized = NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url), { status: 307 });
        const sc = typeof logtoResponse.headers.getSetCookie === "function" ? logtoResponse.headers.getSetCookie() : [];
        for (const header of sc) {
          unauthorized.headers.append("Set-Cookie", header);
        }
        unauthorized.cookies.delete(LOGTO_ADMIN_SESSION_COOKIE);
        return unauthorized;
      }
    }
  } catch {
    // Fall back to the original Logto response.
  }

  return logtoResponse;
}
