import { runtimeState, nextId } from "@/lib/store";
import { BillingMode, BillingProfile, SettlementFrequency } from "@/lib/types";
import { settlePerformanceFee } from "@/lib/engine/asset-pool";

const billingModes: BillingMode[] = ["PERFORMANCE", "SUBSCRIPTION"];
const settlementFrequencies: SettlementFrequency[] = ["EVENT_END", "DAILY", "WEEKLY"];

export function listProfiles() {
  return Object.values(runtimeState.profiles);
}

export function getProfile(userId: string) {
  return runtimeState.profiles[userId];
}

export function updateProfile(userId: string, patch: Partial<BillingProfile>) {
  const profile = runtimeState.profiles[userId];
  if (!profile) {
    return { error: "Profile not found" } as const;
  }

  if (patch.billingMode && !billingModes.includes(patch.billingMode)) {
    return { error: "Invalid billingMode" } as const;
  }

  if (patch.settlementFrequency && !settlementFrequencies.includes(patch.settlementFrequency)) {
    return { error: "Invalid settlementFrequency" } as const;
  }

  if (patch.volumeFeeRate !== undefined && (patch.volumeFeeRate < 0.001 || patch.volumeFeeRate > 0.03)) {
    return { error: "volumeFeeRate must be in [0.001, 0.03]" } as const;
  }

  runtimeState.profiles[userId] = { ...profile, ...patch };
  return { profile: runtimeState.profiles[userId] } as const;
}

export function processTradeVolumeCharge(userId: string, executedVolumeUsd: number, eventId: string) {
  const profile = runtimeState.profiles[userId];
  if (!profile) {
    return { code: "NOT_FOUND", message: "Profile not found" } as const;
  }

  if (profile.billingMode !== "SUBSCRIPTION") {
    return { code: "BYPASS_VOLUME_CHARGE", profile } as const;
  }

  const serviceFee = executedVolumeUsd * profile.volumeFeeRate;
  if (profile.pscBalance < serviceFee) {
    profile.accountStatus = "quota_exhausted";
    return {
      code: "INSUFFICIENT_TOKEN_HALT",
      requiredFee: Number(serviceFee.toFixed(4)),
      currentBalance: profile.pscBalance,
      profile
    } as const;
  }

  profile.pscBalance = Number((profile.pscBalance - serviceFee).toFixed(4));
  profile.totalTradedVolumeUsd = Number((profile.totalTradedVolumeUsd + executedVolumeUsd).toFixed(2));

  runtimeState.settlements.unshift({
    id: nextId("SET"),
    userId,
    mode: profile.billingMode,
    eventId,
    tradedVolumeUsd: executedVolumeUsd,
    platformRevenueUsd: Number(serviceFee.toFixed(2)),
    timestamp: new Date().toISOString()
  });

  return {
    code: "VOLUME_FEE_SUCCESS",
    serviceFee: Number(serviceFee.toFixed(4)),
    profile
  } as const;
}

export function settlePerformance(userId: string, eventId: string, netProfitUsd: number) {
  const profile = runtimeState.profiles[userId];
  if (!profile) {
    return { error: "Profile not found" } as const;
  }

  const result = settlePerformanceFee(profile, eventId, netProfitUsd);
  runtimeState.profiles[userId] = result.profile;
  runtimeState.settlements.unshift(result.ledger);

  return {
    feeUsd: result.feeUsd,
    profile: result.profile,
    ledger: result.ledger
  } as const;
}
