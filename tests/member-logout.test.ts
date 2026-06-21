import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/auth-config", () => ({
  getAuthConfigurationStatus: () => ({
    logto: {
      configured: false,
      missing: ["LOGTO_ENDPOINT"]
    },
    turnstile: {
      configured: false,
      missing: ["TURNSTILE_SITE_KEY"]
    }
  }),
  getLogtoClient: () => ({
    handleSignOut: () => () => new Response(null, { status: 307 })
  })
}));

describe("member logout route", () => {
  it("clears the local session even when Logto production config is missing", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST(
      new NextRequest("https://www.polysmart.io/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: "polysmart_member_session=session-token"
        }
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      mode: "local-session-only"
    });
    expect(response.headers.get("set-cookie") ?? "").toContain("polysmart_member_session=;");
  });
});
