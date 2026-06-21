import { NextRequest, NextResponse } from "next/server";
import { assertLogtoConfigured, getLogtoCallbackUrl, getLogtoClient } from "@/lib/services/auth-config";
import { verifyTurnstileToken } from "@/lib/services/turnstile";

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
  if (logtoConfigError) {
    return logtoConfigError;
  }

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
