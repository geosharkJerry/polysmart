import { NextRequest, NextResponse } from "next/server";
import { assertLogtoConfigured } from "@/lib/services/auth-config";
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
  const turnstileResult = await verifyTurnstileToken(turnstileToken, request.headers.get("cf-connecting-ip"));
  if (!turnstileResult.success) {
    return NextResponse.json({ message: "Verification failed." }, { status: 400 });
  }

  if (String(payload.acceptedRegistrationTerms || "") !== "true" && payload.acceptedRegistrationTerms !== true) {
    return NextResponse.json({ message: "Privacy disclosure consent is required." }, { status: 400 });
  }

  const planId = String(payload.planId || "agent-pro");
  const billingCycle = String(payload.billingCycle || "MONTHLY");
  const redirectUrl = new URL("/api/logto/member/sign-up", request.url);
  redirectUrl.searchParams.set("plan", planId);
  redirectUrl.searchParams.set("billingCycle", billingCycle);

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set("polysmart_signup_plan", planId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15
  });
  response.cookies.set("polysmart_signup_billing_cycle", billingCycle, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15
  });
  return response;
}
