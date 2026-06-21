import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runtimeState } from "@/lib/store";
import { registerMemberAsync } from "@/lib/services/member-auth";
import { sendMemberVerificationEmail } from "@/lib/services/member-email";

const envBaseline = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  APP_BASE_URL: process.env.APP_BASE_URL
};

const baseline = structuredClone({
  users: runtimeState.users,
  profiles: runtimeState.profiles,
  subscriptions: runtimeState.subscriptions,
  memberCredentials: (runtimeState as typeof runtimeState & { memberCredentials?: unknown }).memberCredentials,
  memberSessions: (runtimeState as typeof runtimeState & { memberSessions?: unknown }).memberSessions,
  memberVerifications: (runtimeState as typeof runtimeState & { memberVerifications?: unknown }).memberVerifications
});

beforeEach(() => {
  runtimeState.users = structuredClone(baseline.users);
  runtimeState.profiles = structuredClone(baseline.profiles);
  runtimeState.subscriptions = structuredClone(baseline.subscriptions);
  (runtimeState as typeof runtimeState & { memberCredentials?: unknown }).memberCredentials = structuredClone(baseline.memberCredentials);
  (runtimeState as typeof runtimeState & { memberSessions?: unknown }).memberSessions = structuredClone(baseline.memberSessions);
  (runtimeState as typeof runtimeState & { memberVerifications?: unknown }).memberVerifications = structuredClone(baseline.memberVerifications);
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env.RESEND_API_KEY = envBaseline.RESEND_API_KEY;
  process.env.EMAIL_FROM_ADDRESS = envBaseline.EMAIL_FROM_ADDRESS;
  process.env.EMAIL_FROM_NAME = envBaseline.EMAIL_FROM_NAME;
  process.env.APP_BASE_URL = envBaseline.APP_BASE_URL;
});

describe("member verification email delivery", () => {
  it("falls back to a simulated verification delivery when provider secrets are missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM_ADDRESS;

    const result = await sendMemberVerificationEmail({
      email: "member@example.com",
      fullName: "Member Example",
      verificationToken: "token-123",
      verificationUrl: "https://www.polysmart.io/verify-email?token=token-123"
    });

    expect(result.status).toBe("simulated");
    expect(result.provider).toBe("resend");
    expect(result.previewUrl).toContain("/verify-email?token=token-123");
  });

  it("sends a verification email through Resend when runtime secrets are configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM_ADDRESS = "noreply@polysmart.io";
    process.env.EMAIL_FROM_NAME = "Polysmart";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_123" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMemberVerificationEmail({
      email: "member@example.com",
      fullName: "Member Example",
      verificationToken: "token-456",
      verificationUrl: "https://www.polysmart.io/verify-email?token=token-456"
    });

    expect(result.status).toBe("sent");
    expect(result.externalId).toBe("email_123");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("registers a member asynchronously and returns delivery metadata", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM_ADDRESS;

    const result = await registerMemberAsync({
      fullName: "Riley Holt",
      email: "riley@example.com",
      password: "Password123!",
      country: "United States",
      address: "600 California Street, San Francisco, CA",
      acceptedRegistrationTerms: true,
      investorTier: "professional",
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });

    if ("error" in result) {
      throw new Error(result.error);
    }

    expect(result.delivery.status).toBe("simulated");
    expect(result.user.email).toBe("riley@example.com");
  });
});
