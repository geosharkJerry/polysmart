import { NextRequest, NextResponse } from "next/server";
import { listAccountsAsync } from "@/lib/services/accounts";
import { requireAdminSession } from "@/lib/services/admin-guard";
import { requireMemberSession } from "@/lib/services/member-guard";
import { getProfileAsync } from "@/lib/services/billing";
import { getExecutionSnapshot } from "@/lib/services/execution";
import { memberProfileIsComplete } from "@/lib/services/users";
import { getSubscriptionWorkspaceAsync } from "@/lib/services/subscriptions";
import { runtimeState } from "@/lib/store";
import { AccountPlatform, OrderIntentLeg, T0Event } from "@/lib/types";

type ExecutionGuardCode =
  | "UNAUTHORIZED"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "FORBIDDEN_USER_SCOPE"
  | "USER_NOT_FOUND"
  | "USER_NOT_ACTIVE"
  | "SUBSCRIPTION_INVALID"
  | "BILLING_ACCOUNT_BLOCKED"
  | "INSUFFICIENT_POINTS_BALANCE"
  | "MANAGED_PROFILE_INVALID"
  | "EVENT_NOT_FOUND"
  | "EXECUTION_ACCOUNT_MISSING"
  | "ACCOUNT_KYC_REQUIRED"
  | "ACCOUNT_TRADE_DISABLED"
  | "SYSTEM_RISK_BLOCKED"
  | "INTENT_NOT_FOUND"
  | "KELLY_PLAN_REQUIRED";

type ExecutionGuardFailure = {
  ok: false;
  status: number;
  code: ExecutionGuardCode;
  message: string;
  details?: Record<string, unknown>;
};

type ExecutionGuardSuccess = {
  ok: true;
  event: T0Event | null;
};

function failure(
  status: number,
  code: ExecutionGuardCode,
  message: string,
  details?: Record<string, unknown>
): ExecutionGuardFailure {
  return { ok: false, status, code, message, details };
}

function estimatedVolumeUsd(input: { targetNotionalUsd?: number; legs?: OrderIntentLeg[] }) {
  if (Array.isArray(input.legs)) {
    return Number(input.legs.reduce((sum, leg) => sum + leg.notionalUsd, 0).toFixed(4));
  }
  return Number(input.targetNotionalUsd ?? 0);
}

function subscriptionIsActive(status: string, rentExpiresAt: string | null) {
  if (status !== "active") {
    return false;
  }
  if (!rentExpiresAt) {
    return true;
  }
  return Date.parse(rentExpiresAt) > Date.now();
}

function uniquePlatforms(legs?: OrderIntentLeg[]) {
  return [...new Set((legs ?? []).map((leg) => leg.platform))];
}

function resolvePlatformFailure(platform: AccountPlatform, accounts: Awaited<ReturnType<typeof listAccountsAsync>>) {
  const platformAccounts = accounts.filter((account) => account.platform === platform);
  if (platformAccounts.length === 0) {
    return failure(409, "EXECUTION_ACCOUNT_MISSING", `No execution account is bound for ${platform}.`, { platform });
  }

  const verified = platformAccounts.filter((account) => account.kycStatus === "verified");
  if (verified.length === 0) {
    return failure(409, "ACCOUNT_KYC_REQUIRED", `KYC verification is incomplete for ${platform}.`, { platform });
  }

  const tradable = verified.filter((account) => account.canTrade);
  if (tradable.length === 0) {
    return failure(409, "ACCOUNT_TRADE_DISABLED", `Trading is not enabled for ${platform}.`, { platform });
  }

  return null;
}

export function executionGuardResponse(error: ExecutionGuardFailure) {
  return NextResponse.json(
    {
      code: error.code,
      message: error.message,
      details: error.details ?? null
    },
    { status: error.status }
  );
}

export async function requireExecutionActor(request: NextRequest, userId: string) {
  const admin = await requireAdminSession(request);
  if (!admin.response) {
    return { ok: true, admin: admin.admin, user: null } as const;
  }

  const member = await requireMemberSession(request, {
    userId: userId || undefined,
    requireVerified: false
  });
  if (member.response) {
    if (member.response.status === 401) {
      return {
        ok: false,
        response: executionGuardResponse(failure(401, "UNAUTHORIZED", "Unauthorized"))
      } as const;
    }

    return {
      ok: false,
      response: executionGuardResponse(
        failure(403, "FORBIDDEN_USER_SCOPE", "Members may execute only their own userId.")
      )
    } as const;
  }

  if (!member.user.emailVerifiedAt) {
    return {
      ok: false,
      response: executionGuardResponse(
        failure(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification required before execution.")
      )
    } as const;
  }

  if (!memberProfileIsComplete(member.user)) {
    return {
      ok: false,
      response: executionGuardResponse(
        failure(403, "SUBSCRIPTION_INVALID", "Complete the member profile before execution is released.")
      )
    } as const;
  }

  return { ok: true, admin: null, user: member.user } as const;
}

export async function requireExecutionActorForIntent(request: NextRequest, intentId: string) {
  const intent = getExecutionSnapshot(intentId).intent;
  if (!intent) {
    return {
      ok: false,
      response: executionGuardResponse(failure(404, "INTENT_NOT_FOUND", "Execution intent was not found."))
    } as const;
  }

  const admin = await requireAdminSession(request);
  if (!admin.response) {
    return { ok: true, admin: admin.admin, user: null, intent } as const;
  }

  const member = await requireMemberSession(request, { requireVerified: false });
  if (member.response) {
    return {
      ok: false,
      response:
        member.response.status === 401
          ? executionGuardResponse(failure(401, "UNAUTHORIZED", "Unauthorized"))
          : executionGuardResponse(failure(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification required"))
    } as const;
  }

  if (member.user.userId !== intent.userId) {
    return {
      ok: false,
      response: executionGuardResponse(
        failure(403, "FORBIDDEN_USER_SCOPE", "Members may execute only their own userId.")
      )
    } as const;
  }

  if (!member.user.emailVerifiedAt) {
    return {
      ok: false,
      response: executionGuardResponse(
        failure(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification required before execution.")
      )
    } as const;
  }

  if (!memberProfileIsComplete(member.user)) {
    return {
      ok: false,
      response: executionGuardResponse(
        failure(403, "SUBSCRIPTION_INVALID", "Complete the member profile before execution is released.")
      )
    } as const;
  }

  return { ok: true, admin: null, user: member.user, intent } as const;
}

export async function validateExecutionEligibility(input: {
  userId: string;
  eventId: string;
  targetNotionalUsd?: number;
  legs?: OrderIntentLeg[];
}) {
  const workspace = await getSubscriptionWorkspaceAsync(input.userId);
  const profile = await getProfileAsync(input.userId);
  const accounts = await listAccountsAsync(input.userId);
  const event = runtimeState.events.find((entry) => entry.id === input.eventId) ?? null;

  if (!workspace?.user || !workspace.subscription || !profile) {
    return failure(404, "USER_NOT_FOUND", "Execution member record was not found.");
  }

  if (workspace.user.status !== "active") {
    return failure(403, "USER_NOT_ACTIVE", "Only active members may execute strategy actions.");
  }

  if (!workspace.user.emailVerifiedAt) {
    return failure(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification required before execution.");
  }

  if (!memberProfileIsComplete(workspace.user)) {
    return failure(403, "SUBSCRIPTION_INVALID", "Complete the member profile before execution is released.");
  }

  if (!subscriptionIsActive(workspace.subscription.status, profile.rentExpiresAt)) {
    return failure(403, "SUBSCRIPTION_INVALID", "An active subscription is required before execution.");
  }

  if (profile.accountStatus !== "active") {
    return failure(409, "BILLING_ACCOUNT_BLOCKED", "The billing profile is not eligible for execution.", {
      accountStatus: profile.accountStatus
    });
  }

  if (!event) {
    return failure(404, "EVENT_NOT_FOUND", "Execution event was not found.");
  }

  if (runtimeState.risk.status !== "NORMAL") {
    return failure(409, "SYSTEM_RISK_BLOCKED", "System risk controls are blocking execution.", {
      riskStatus: runtimeState.risk.status,
      reason: runtimeState.risk.reason
    });
  }

  const volumeUsd = estimatedVolumeUsd(input);
  if (profile.serviceType === "SELF_SERVICE" || profile.billingMode === "SUBSCRIPTION") {
    const requiredPoints = Number((volumeUsd * profile.volumeFeeRate).toFixed(4));
    if (profile.pointsBalance < requiredPoints) {
      return failure(409, "INSUFFICIENT_POINTS_BALANCE", "Insufficient points balance for execution.", {
        requiredPoints,
        currentPointsBalance: profile.pointsBalance
      });
    }
  } else if (
    profile.serviceType === "MANAGED" ||
    profile.billingMode === "PERFORMANCE"
  ) {
    if (!profile.managedUsdtAddress || profile.performanceFeeRate <= 0 || profile.performanceFeeRate > 0.5) {
      return failure(409, "MANAGED_PROFILE_INVALID", "Managed commission settlement configuration is incomplete.", {
        managedUsdtAddress: profile.managedUsdtAddress,
        performanceFeeRate: profile.performanceFeeRate
      });
    }
  }

  if (accounts.length === 0) {
    return failure(409, "EXECUTION_ACCOUNT_MISSING", "At least one execution account must be bound before trading.");
  }

  const platforms = uniquePlatforms(input.legs);
  if (platforms.length > 0) {
    for (const platform of platforms) {
      const platformFailure = resolvePlatformFailure(platform, accounts);
      if (platformFailure) {
        return platformFailure;
      }
    }
  } else {
    const verified = accounts.filter((account) => account.kycStatus === "verified");
    if (verified.length === 0) {
      return failure(409, "ACCOUNT_KYC_REQUIRED", "At least one verified execution account is required.");
    }
    const tradable = verified.filter((account) => account.canTrade);
    if (tradable.length === 0) {
      return failure(409, "ACCOUNT_TRADE_DISABLED", "At least one verified execution account must be trade-enabled.");
    }
  }

  return { ok: true, event } satisfies ExecutionGuardSuccess;
}

export async function validateExecutionSubmitIntent(intentId: string) {
  const snapshot = getExecutionSnapshot(intentId);
  const intent = snapshot.intent;
  if (!intent) {
    return failure(404, "INTENT_NOT_FOUND", "Execution intent was not found.");
  }
  if (!intent.kellyPlanId) {
    return failure(409, "KELLY_PLAN_REQUIRED", "Execution intent is missing its Kelly plan provenance.");
  }

  return validateExecutionEligibility({
    userId: intent.userId,
    eventId: intent.eventId,
    legs: intent.legs
  });
}
