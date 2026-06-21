import { beforeEach, describe, expect, it } from "vitest";
import { runtimeState } from "@/lib/store";
import { loginMember, registerMember, verifyMemberEmail } from "@/lib/services/member-auth";

const baseline = structuredClone({
  users: runtimeState.users,
  profiles: runtimeState.profiles,
  subscriptions: runtimeState.subscriptions,
  systemSettings: runtimeState.systemSettings,
  memberCredentials: (runtimeState as typeof runtimeState & { memberCredentials?: unknown }).memberCredentials,
  memberSessions: (runtimeState as typeof runtimeState & { memberSessions?: unknown }).memberSessions,
  memberVerifications: (runtimeState as typeof runtimeState & { memberVerifications?: unknown }).memberVerifications,
  auditLogs: runtimeState.auditLogs
});

beforeEach(() => {
  runtimeState.users = structuredClone(baseline.users);
  runtimeState.profiles = structuredClone(baseline.profiles);
  runtimeState.subscriptions = structuredClone(baseline.subscriptions);
  runtimeState.systemSettings = structuredClone(baseline.systemSettings);
  (runtimeState as typeof runtimeState & { memberCredentials?: unknown }).memberCredentials = structuredClone(baseline.memberCredentials);
  (runtimeState as typeof runtimeState & { memberSessions?: unknown }).memberSessions = structuredClone(baseline.memberSessions);
  (runtimeState as typeof runtimeState & { memberVerifications?: unknown }).memberVerifications = structuredClone(baseline.memberVerifications);
  runtimeState.auditLogs = structuredClone(baseline.auditLogs);
});

describe("member registration and verification", () => {
  it("creates a member record from a selected subscription plan and requires verification before login", () => {
    const registered = registerMember({
      fullName: "Lena Park",
      email: "lena@example.com",
      password: "Password123!",
      country: "Singapore",
      address: "88 Market Street, Singapore",
      acceptedRegistrationTerms: true,
      investorTier: "professional",
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });

    if ("error" in registered) {
      throw new Error(registered.error);
    }

    expect(registered.user.email).toBe("lena@example.com");
    expect(registered.user.address).toBe("88 Market Street, Singapore");
    expect(registered.user.emailVerifiedAt).toBeNull();
    expect(registered.user.privacyConsentAcceptedAt).not.toBeNull();
    expect(registered.user.privacyConsentVersion).toBeTruthy();
    expect(registered.profile.billingMode).toBe("SUBSCRIPTION");
    expect(registered.subscription.status).toBe("trialing");
    expect(registered.verification.token.length).toBeGreaterThan(10);
    expect(loginMember("lena@example.com", "Password123!")).toBeNull();
  });

  it("verifies the email and then allows login", () => {
    runtimeState.systemSettings.payment.managedPerformanceFeeRate = 0.125;
    const registered = registerMember({
      fullName: "Noah Grant",
      email: "noah@example.com",
      password: "Password123!",
      country: "United States",
      address: "250 Hudson Street, New York, NY",
      acceptedRegistrationTerms: true,
      investorTier: "retail",
      planId: "managed-performance",
      billingCycle: "MONTHLY"
    });

    if ("error" in registered) {
      throw new Error(registered.error);
    }

    const verified = verifyMemberEmail(registered.verification.token);
    if ("error" in verified) {
      throw new Error(verified.error);
    }

    expect(verified.user.emailVerifiedAt).not.toBeNull();
    expect(verified.subscription.planId).toBe("managed-performance");
    expect(registered.profile.performanceFeeRate).toBe(0.125);

    const login = loginMember("noah@example.com", "Password123!");
    expect(login).not.toBeNull();
    expect(login?.user.email).toBe("noah@example.com");
  });

  it("rejects duplicate member registration by email", () => {
    const first = registerMember({
      fullName: "Mia Chen",
      email: "mia@example.com",
      password: "Password123!",
      country: "Hong Kong",
      address: "18 Queen's Road Central, Hong Kong",
      acceptedRegistrationTerms: true,
      investorTier: "professional",
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });
    if ("error" in first) {
      throw new Error(first.error);
    }

    const second = registerMember({
      fullName: "Mia Chen 2",
      email: "mia@example.com",
      password: "Password123!",
      country: "Hong Kong",
      address: "19 Queen's Road Central, Hong Kong",
      acceptedRegistrationTerms: true,
      investorTier: "professional",
      planId: "institutional",
      billingCycle: "ANNUAL"
    });

    expect("error" in second && second.error).toContain("already registered");
  });

  it("requires address as part of member registration", () => {
    const result = registerMember({
      fullName: "Ava Lopez",
      email: "ava@example.com",
      password: "Password123!",
      country: "Spain",
      address: "",
      acceptedRegistrationTerms: true,
      investorTier: "retail",
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });

    expect("error" in result && result.error).toContain("Missing required");
  });

  it("requires agreement to the registration privacy disclosure before creating the member", () => {
    const result = registerMember({
      fullName: "Ethan White",
      email: "ethan@example.com",
      password: "Password123!",
      country: "United States",
      address: "500 Howard Street, San Francisco, CA",
      acceptedRegistrationTerms: false,
      investorTier: "professional",
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });

    expect("error" in result && result.error).toContain("must accept");
  });
});
