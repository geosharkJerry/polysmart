import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/member-auth", () => ({
  MEMBER_SESSION_COOKIE: "polysmart_member_session",
  resolveMemberToken: (authHeader?: string | null, cookieToken?: string | null) => {
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return cookieToken || "";
  },
  getMemberByTokenAsync: vi.fn(async (token: string) => {
    if (token === "bearer-member-token") {
      return {
        userId: "user-alpha",
        fullName: "Avery Stone",
        email: "avery@polysmart.io",
        authSubject: null,
        authProvider: "INTERNAL",
        country: "United States",
        address: "1 Market Street",
        investorTier: "professional",
        status: "active",
        referralCode: null,
        emailVerifiedAt: new Date().toISOString(),
        privacyConsentAcceptedAt: new Date().toISOString(),
        privacyConsentVersion: "2026-06-us-privacy-v1",
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
    }
    return null;
  })
}));

vi.mock("@/lib/services/logto-session", () => ({
  LOGTO_MEMBER_SESSION_COOKIE: "polysmart_member_session",
  getMemberByLogtoSessionToken: vi.fn(async (token: string) => {
    if (token === "logto-session-token") {
      return {
        userId: "user-logto",
        fullName: "Logto Member",
        email: "member@polysmart.io",
        authSubject: "logto-subject-1",
        authProvider: "LOGTO",
        country: "Unknown",
        address: "",
        investorTier: "retail",
        status: "active",
        referralCode: null,
        emailVerifiedAt: new Date().toISOString(),
        privacyConsentAcceptedAt: null,
        privacyConsentVersion: null,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
    }
    return null;
  })
}));

import { requireMemberSession } from "@/lib/services/member-guard";

function buildRequest(options?: {
  authorization?: string;
  cookie?: string;
}) {
  return new NextRequest("http://localhost/api/auth/me", {
    headers: {
      ...(options?.authorization ? { Authorization: options.authorization } : {}),
      ...(options?.cookie ? { cookie: options.cookie } : {})
    }
  });
}

describe("member guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects legacy browser cookies so browser auth stays on Logto", async () => {
    const request = buildRequest({
      cookie: "polysmart_member_session=legacy-browser-token"
    });

    const result = await requireMemberSession(request);

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
    await expect(result.response?.json()).resolves.toMatchObject({
      message: "Legacy browser sessions are disabled. Please sign in again with Logto."
    });
  });

  it("accepts a Logto browser session cookie", async () => {
    const request = buildRequest({
      cookie: "polysmart_member_session=logto-session-token"
    });

    const result = await requireMemberSession(request);

    expect(result.response).toBeNull();
    expect(result.user?.userId).toBe("user-logto");
    expect(result.user?.authProvider).toBe("LOGTO");
  });

  it("keeps bearer-token compatibility for non-browser callers", async () => {
    const request = buildRequest({
      authorization: "Bearer bearer-member-token"
    });

    const result = await requireMemberSession(request);

    expect(result.response).toBeNull();
    expect(result.user?.userId).toBe("user-alpha");
    expect(result.user?.authProvider).toBe("INTERNAL");
  });
});
