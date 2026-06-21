import { NextRequest, NextResponse } from "next/server";
import { assertLogtoConfigured, getLogtoCallbackUrl, getLogtoClient } from "@/lib/services/auth-config";
import { verifyTurnstileToken } from "@/lib/services/turnstile";
import { loginMember, loginMemberAsync } from "@/lib/services/member-auth";

export const dynamic = "force-dynamic";

async function readPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const form = await request.formData().catch(() => null);
  if (!form) {
    return {};
  }
  return Object.fromEntries(form.entries()) as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const logtoConfigError = assertLogtoConfigured();

  if (!logtoConfigError) {
    // Logto is configured: use Logto sign-in
    const payload = await readPayload(request);
    const turnstileToken = String(payload.turnstileToken || "");
    const loginHint = String(payload.email || "");
    const verified = await verifyTurnstileToken(turnstileToken, request.headers.get("cf-connecting-ip"));
    if (!verified.success) {
      return NextResponse.json({ message: "Verification failed." }, { status: 400 });
    }

    const client = getLogtoClient();
    const redirect = await client.handleSignIn({
      redirectUri: new URL(getLogtoCallbackUrl("member"), request.url),
      postRedirectUri: new URL("/console", request.url),
      loginHint: loginHint || undefined,
      interactionMode: "signIn"
    })(request);
    return redirect;
  }

  // Logto not configured: local login fallback
  const payload = await readPayload(request);
  const turnstileToken = String(payload.turnstileToken || "");
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  const verified = await verifyTurnstileToken(turnstileToken, request.headers.get("cf-connecting-ip"));
  if (!verified.success) {
    return NextResponse.json({ message: "Verification failed." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  try {
    const result = await loginMemberAsync(email, password);
    if (!result) {
      return NextResponse.json({ message: "Invalid email or password, or account not verified." }, { status: 401 });
    }

    const response = NextResponse.json({ message: "Login successful." });
    response.cookies.set("polysmart_member_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Login failed due to a system error." }, { status: 500 });
  }
}
