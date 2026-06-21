import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireMemberSession = vi.fn();
const requireExecutionActorForIntent = vi.fn();

vi.mock("@/lib/services/member-guard", () => ({
  requireMemberSession
}));

vi.mock("@/lib/services/execution-guard", () => ({
  requireExecutionActorForIntent
}));

const incompleteMember = {
  userId: "user-incomplete",
  fullName: "New Member",
  email: "member@polysmart.io",
  authSubject: "logto-subject",
  authProvider: "LOGTO" as const,
  country: "Unknown",
  address: "",
  investorTier: "retail" as const,
  status: "active" as const,
  referralCode: null,
  emailVerifiedAt: new Date().toISOString(),
  privacyConsentAcceptedAt: null,
  privacyConsentVersion: null,
  lastActiveAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

describe("member profile completion guard", () => {
  beforeEach(() => {
    vi.resetModules();
    requireMemberSession.mockReset();
    requireExecutionActorForIntent.mockReset();
  });

  it("blocks Stripe checkout before the member profile is completed", async () => {
    requireMemberSession.mockResolvedValue({
      user: incompleteMember,
      token: "member-token",
      response: null
    });

    const { POST } = await import("@/app/api/payments/stripe/checkout/route");
    const response = await POST(
      new NextRequest("https://www.polysmart.io/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: "points-500" })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "MEMBER_PROFILE_INCOMPLETE"
    });
  });

  it("blocks account binding before the member profile is completed", async () => {
    requireMemberSession.mockResolvedValue({
      user: incompleteMember,
      token: "member-token",
      response: null
    });

    const { POST } = await import("@/app/api/accounts/route");
    const response = await POST(
      new NextRequest("https://www.polysmart.io/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "polymarket",
          label: "Primary",
          proxyUrl: "socks5://proxy",
          credentials: { apiKey: "abc" }
        })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "MEMBER_PROFILE_INCOMPLETE"
    });
  });

  it("blocks execution signing when the member profile is incomplete", async () => {
    requireExecutionActorForIntent.mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({
          code: "SUBSCRIPTION_INVALID",
          message: "Complete the member profile before execution is released."
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    });

    const { POST } = await import("@/app/api/execution/sign/route");
    const response = await POST(
      new NextRequest("https://www.polysmart.io/api/execution/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId: "intent-123" })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "SUBSCRIPTION_INVALID"
    });
  });
});
