import { AssetPoolState, RiskMetrics } from "@/lib/types";

export function evaluateCircuitBreaker(metrics: Omit<RiskMetrics, "status" | "reason" | "updatedAt">): RiskMetrics {
  let status: RiskMetrics["status"] = "NORMAL";
  let reason: string | null = null;

  if (metrics.hedgeLatencyMs > 1500 && metrics.inventoryDeviationPct >= 0.2) {
    status = "CIRCUIT_BREAKER";
    reason = "LEG_IN_TIMEOUT";
  } else if (metrics.blockedAccounts > 0) {
    status = "CIRCUIT_BREAKER";
    reason = "ACCOUNT_BLOCKED";
  } else if (metrics.slippagePct > 0.015) {
    status = "CIRCUIT_BREAKER";
    reason = "SLIPPAGE_COLLAPSE";
  }

  return {
    ...metrics,
    status,
    reason,
    updatedAt: new Date().toISOString()
  };
}

export function executeEmergencyWithdrawal(
  pool: AssetPoolState,
  userShares: number,
  totalShares: number,
  emergencyPenaltyRate: number
) {
  if (userShares <= 0 || totalShares <= 0) {
    return { status: "INVALID", payoutUsd: 0, penaltyUsd: 0 };
  }

  const gross = pool.totalAssetsUsd * (userShares / totalShares);
  const penaltyUsd = gross * emergencyPenaltyRate;
  const payoutUsd = gross - penaltyUsd;

  if (pool.liquidBufferUsd < payoutUsd) {
    return {
      status: "QUEUED_FOR_MANUAL",
      payoutUsd: Number(payoutUsd.toFixed(2)),
      penaltyUsd: Number(penaltyUsd.toFixed(2))
    };
  }

  return {
    status: "PAID",
    payoutUsd: Number(payoutUsd.toFixed(2)),
    penaltyUsd: Number(penaltyUsd.toFixed(2))
  };
}
