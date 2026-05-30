import { executeEmergencyWithdrawal, evaluateCircuitBreaker } from "@/lib/engine/risk-controller";
import { depositToPool, recalcNav } from "@/lib/engine/asset-pool";
import { applyHealingTransition, deriveHealingActions } from "@/lib/engine/self-healing";
import { triggerRedemptionDrivenFlashLiquidation } from "@/lib/services/settlement-trap";
import { pushAudit, runtimeState } from "@/lib/store";

export function getRiskSnapshot() {
  return runtimeState.risk;
}

export function getRiskBundle() {
  return {
    risk: runtimeState.risk,
    healing: runtimeState.healing
  };
}

export function evaluateAndApplyRisk(input: {
  inventoryDeviationPct: number;
  hedgeLatencyMs: number;
  slippagePct: number;
  blockedAccounts: number;
}) {
  const next = evaluateCircuitBreaker(input, runtimeState.config.hedgeTimeoutMs);
  runtimeState.risk = next;

  const actions = deriveHealingActions(next, runtimeState.healing);
  if (actions.length > 0) {
    runtimeState.healing = applyHealingTransition(runtimeState.healing, actions);
    pushAudit("RISK", "self-healing actions generated", {
      actions,
      mode: runtimeState.healing.mode,
      reason: runtimeState.healing.reason
    });
  }

  return {
    risk: runtimeState.risk,
    healing: runtimeState.healing,
    actions
  };
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
  pushAudit("BILLING", "pool deposit", { userId, amountUsd });
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

  pushAudit("BILLING", "pool event settled", { userId, profitUsd });
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

  let result = executeEmergencyWithdrawal(
    runtimeState.poolState,
    member.shares,
    runtimeState.poolState.totalShares,
    runtimeState.poolState.emergencyPenaltyRate
  );

  if (result.status === "QUEUED_FOR_MANUAL") {
    const flash = triggerRedemptionDrivenFlashLiquidation(result.payoutUsd);
    result = executeEmergencyWithdrawal(
      runtimeState.poolState,
      member.shares,
      runtimeState.poolState.totalShares,
      runtimeState.poolState.emergencyPenaltyRate
    );

    pushAudit("RISK", "flash liquidation attempted for emergency redemption", {
      userId,
      requestedPayoutUsd: result.payoutUsd,
      flash
    });
  }

  if (result.status === "PAID") {
    runtimeState.poolState.liquidBufferUsd = Number((runtimeState.poolState.liquidBufferUsd - result.payoutUsd).toFixed(2));
    runtimeState.poolState.totalAssetsUsd = Number((runtimeState.poolState.totalAssetsUsd - (result.payoutUsd + result.penaltyUsd)).toFixed(2));
    runtimeState.poolState.totalShares = Number((runtimeState.poolState.totalShares - member.shares).toFixed(6));
    delete runtimeState.poolMembers[userId];
    runtimeState.poolState = recalcNav(runtimeState.poolState);
  }

  pushAudit("BILLING", "emergency withdraw", { userId, result });
  return result;
}

export function getAuditLogs(limit = 100) {
  return runtimeState.auditLogs.slice(0, Math.max(1, limit));
}
