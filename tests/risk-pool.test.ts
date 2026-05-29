import { describe, expect, it } from "vitest";
import { evaluateCircuitBreaker, executeEmergencyWithdrawal } from "@/lib/engine/risk-controller";

describe("risk controller", () => {
  it("triggers breaker on severe latency and inventory deviation", () => {
    const out = evaluateCircuitBreaker({
      inventoryDeviationPct: 0.25,
      hedgeLatencyMs: 1700,
      slippagePct: 0.005,
      blockedAccounts: 0
    });

    expect(out.status).toBe("CIRCUIT_BREAKER");
    expect(out.reason).toBe("LEG_IN_TIMEOUT");
  });

  it("returns queued when liquid buffer is insufficient", () => {
    const out = executeEmergencyWithdrawal(
      {
        totalAssetsUsd: 100000,
        liquidBufferUsd: 100,
        totalShares: 100000,
        nav: 1,
        emergencyPenaltyRate: 0.02,
        updatedAt: new Date().toISOString()
      },
      5000,
      100000,
      0.02
    );

    expect(out.status).toBe("QUEUED_FOR_MANUAL");
  });
});
