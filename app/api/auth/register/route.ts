import { NextRequest, NextResponse } from "next/server";
import { assertLogtoConfigured } from "@/lib/services/auth-config";
import { verifyTurnstileToken } from "@/lib/services/turnstile";
import { registerMemberAsync } from "@/lib/services/member-auth";

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

  // Logto 配置检查
  const logtoConfigError = assertLogtoConfigured();

  if (!logtoConfigError) {
    // Logto 已配置 -> 跳转到 Logto 注册
    const redirectUrl = new URL("/api/logto/member/sign-up", request.url);
    redirectUrl.searchParams.set("plan", planId);
    redirectUrl.searchParams.set("billingCycle", billingCycle);
    const response = NextResponse.redirect(redirectUrl, { status: 303 });
    response.cookies.set("polysmart_signup_plan", planId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 15 });
    response.cookies.set("polysmart_signup_billing_cycle", billingCycle, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 15 });
    return response;
  }

  // Logto 未配置 -> 本地注册降级
  const fullName = String(payload.fullName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const country = String(payload.country || "").trim();
  const address = String(payload.address || "").trim();

  if (!fullName || !email || !password || !country || !address) {
    return NextResponse.json({ message: "All registration fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const result = await registerMemberAsync({
      fullName,
      email,
      password,
      country,
      address,
      acceptedRegistrationTerms: true,
      investorTier: "professional",
      planId: planId as any,
      billingCycle: billingCycle as any
    });

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 409 });
    }

    const verificationUrl = new URL("/verify-email", request.url);
    verificationUrl.searchParams.set("email", email);
    const response = NextResponse.redirect(verificationUrl, { status: 303 });
    response.cookies.set("polysmart_member_session", result.user.userId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 15 });
    return response;
  } catch (error) {
    const message = (error as Error).message || "Registration failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
