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
  LOGTO_ADMIN_SESSION_COOKIE: "polysmart_admin_session",
  createLocalLogtoSession
}));

describe("admin Logto callback", () => {
  beforeEach(() => {
    vi.resetModules();
    handleSignInCallback.mockReset();
    getLogtoContext.mockReset();
    createLocalLogtoSession.mockReset();
  });

  it("rejects non-super-admin Logto identities", async () => {
    handleSignInCallback.mockReturnValue(() => new Response(null, { status: 307, headers: { Location: "/admin" } }));
    getLogtoContext.mockResolvedValue({
      isAuthenticated: true,
      claims: { sub: "logto-user-1" },
      userInfo: { email: "someone@example.com" }
    });

    const { GET } = await import("@/app/api/logto/admin/callback/route");
    const response = await GET(new NextRequest("https://www.polysmart.io/api/logto/admin/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.polysmart.io/admin/login?error=unauthorized");
    expect(createLocalLogtoSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie") ?? "").toContain("polysmart_admin_session=;");
  });

  it("issues a local admin session only for the configured super admin identity", async () => {
    handleSignInCallback.mockReturnValue(() => new Response(null, { status: 307, headers: { Location: "/admin" } }));
    getLogtoContext.mockResolvedValue({
      isAuthenticated: true,
      claims: { sub: "logto-admin-1" },
      userInfo: { email: "Infor@Polysmart.io" }
    });
    createLocalLogtoSession.mockResolvedValue({
      token: "admin-session-token",
      expiresAt: "2030-01-01T00:00:00.000Z"
    });

    const { GET } = await import("@/app/api/logto/admin/callback/route");
    const response = await GET(new NextRequest("https://www.polysmart.io/api/logto/admin/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.polysmart.io/admin");
    expect(createLocalLogtoSession).toHaveBeenCalledWith({
      surface: "admin",
      subject: "logto-admin-1",
      provider: "LOGTO",
      email: "infor@polysmart.io"
    });
    expect(response.headers.get("set-cookie") ?? "").toContain("polysmart_admin_session=admin-session-token");
  });
});
