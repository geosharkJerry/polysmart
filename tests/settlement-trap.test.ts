import { beforeEach, describe, expect, it } from "vitest";
import { runtimeState } from "@/lib/store";
import {
  computeDynamicApy,
  getAntiLockupCeilingUsd,
  getSettlementTrapExposureUsd,
  getSettlementTrapSnapshot,
  scanSettlementLiquidityTraps,
  triggerRedemptionDrivenFlashLiquidation
} from "@/lib/services/settlement-trap";

const basePool = {
  ...runtimeState.poolState
};
const baseTraps = runtimeState.settlementTraps.map((t) => ({ ...t }));
const baseFlash = runtimeState.lastFlashLiquidation ? { ...runtimeState.lastFlashLiquidation } : null;

describe("settlement trap service", () => {
  beforeEach(() => {
    runtimeState.poolState = { ...basePool };
    runtimeState.settlementTraps = baseTraps.map((t) => ({ ...t }));
    runtimeState.lastFlashLiquidation = baseFlash ? { ...baseFlash } : null;
  });

  it("computes dynamic APY using time-to-settlement exponent", () => {
    const apy = computeDynamicApy(0.97, 1.5);
    expect(apy).toBeGreaterThan(3.0);
  });

  it("enforces anti-lockup ceiling and keeps active exposure below cap", () => {
    const ceiling = getAntiLockupCeilingUsd();
    const exposure = getSettlementTrapExposureUsd();
    expect(ceiling).toBeGreaterThan(0);
    expect(exposure).toBeLessThanOrEqual(ceiling);
  });

  it("deploys scan candidates and supports redemption-driven flash liquidation", () => {
    runtimeState.settlementTraps = [];
    const scan = scanSettlementLiquidityTraps();
    expect(scan.deployed.length).toBeGreaterThan(0);

    runtimeState.poolState.liquidBufferUsd = 1000;
    const report = triggerRedemptionDrivenFlashLiquidation(5000);
    expect(report.triggered).toBe(true);
    expect(report.reclaimedUsd).toBeGreaterThan(0);

    const snapshot = getSettlementTrapSnapshot();
    expect(snapshot.liquidatedTraps.length).toBeGreaterThan(0);
  });
});
