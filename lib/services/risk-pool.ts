import { executeEmergencyWithdrawal, evaluateCircuitBreaker } from "@/lib/engine/risk-controller";
import { depositToPool, recalcNav } from "@/lib/engine/asset-pool";
import { runtimeState } from "@/lib/store";

export function getRiskSnapshot() {
  return runtimeState.risk;
}

export function evaluateAndApplyRisk(input: {
  inventoryDeviationPct: number;
  hedgeLatencyMs: number;
  slippagePct: number;
  blockedAccounts: number;
}) {
  const next = evaluateCircuitBreaker(input);
  runtimeState.risk = next;
  return next;
}

export function getPoolSummary() {
  runtimeState.poolState = recalcNav(runtimeState.poolState);
  return {
    pool: runtimeState.poolState,
    members: Object.values(runtimeState.poolMembers)
  };
}

export function depositPool(userId: string, amountUsd: number) {
  const member = runtimeState.poolMembers[userId];
  const { pool, member: updated } = depositToPool(runtimeState.poolState, member, amountUsd, userId);
  runtimeState.poolState = pool;
  runtimeState.poolMembers[userId] = updated;
  return {
    pool,
    member: updated
  };
}

export function settlePoolEvent(userId: string, profitUsd: number) {
  const member = runtimeState.poolMembers[userId];
  if (!member) {
    return { error: "Pool member not found" } as const;
  }

  member.pnlUsd = Number((member.pnlUsd + profitUsd).toFixed(2));
  runtimeState.poolState.totalAssetsUsd = Number((runtimeState.poolState.totalAssetsUsd + profitUsd).toFixed(2));
  runtimeState.poolState = recalcNav(runtimeState.poolState);

  return {
    pool: runtimeState.poolState,
    member
  } as const;
}

export function emergencyWithdraw(userId: string) {
  const member = runtimeState.poolMembers[userId];
  if (!member) {
    return { status: "INVALID", reason: "Pool member not found" } as const;
  }

  const result = executeEmergencyWithdrawal(
    runtimeState.poolState,
    member.shares,
    runtimeState.poolState.totalShares,
    runtimeState.poolState.emergencyPenaltyRate
  );

  if (result.status === "PAID") {
    runtimeState.poolState.liquidBufferUsd = Number((runtimeState.poolState.liquidBufferUsd - result.payoutUsd).toFixed(2));
    runtimeState.poolState.totalAssetsUsd = Number((runtimeState.poolState.totalAssetsUsd - (result.payoutUsd + result.penaltyUsd)).toFixed(2));
    runtimeState.poolState.totalShares = Number((runtimeState.poolState.totalShares - member.shares).toFixed(6));
    delete runtimeState.poolMembers[userId];
    runtimeState.poolState = recalcNav(runtimeState.poolState);
  }

  return result;
}
