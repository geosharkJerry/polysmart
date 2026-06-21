import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getLogtoContext = vi.fn();
const handleSignInCallback = vi.fn();
const createLocalLogtoSession = vi.fn();

vi.mock("@/lib/services/auth-config", () => ({
  assertLogtoConfigured: () => null,
  getLogtoClient: () => ({
    handleSignInCallback,
    getLogtoContext
  })
}));

vi.mock("@/lib/services/logto-session", () => ({
  LOGTO_MEMBER_SESSION_COOKIE: "polysmart_member_session",
  createLocalLogtoSession
}));

describe("member Logto callback", () => {
  beforeEach(() => {
    vi.resetModules();
    handleSignInCallback.mockReset();
    getLogtoContext.mockReset();
    createLocalLogtoSession.mockReset();
  });

  it("persists the verified-email state reported by Logto", async () => {
    handleSignInCallback.mockReturnValue(() => new Response(null, { status: 307, headers: { Location: "/console" } }));
    getLogtoContext.mockResolvedValue({
      isAuthenticated: true,
      claims: { sub: "logto-member-1" },
      userInfo: { email: "member@example.com", email_verified: false }
    });
    createLocalLogtoSession.mockResolvedValue({
      token: "member-session-token",
      expiresAt: "2030-01-01T00:00:00.000Z"
    });

    const { GET } = await import("@/app/api/logto/member/callback/route");
    const response = await GET(new NextRequest("https://www.polysmart.io/api/logto/member/callback"));

    expect(response.status).toBe(307);
    expect(createLocalLogtoSession).toHaveBeenCalledWith({
      surface: "member",
      subject: "logto-member-1",
      provider: "LOGTO",
      email: "member@example.com",
      emailVerified: false,
      planId: null,
      billingCycle: null
    });
  });
});
