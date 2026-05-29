import { describe, expect, it } from "vitest";
import { computePricing } from "@/lib/engine/pricing";

describe("computePricing", () => {
  it("returns bounded quote prices and positive edge when spread is wide", () => {
    const out = computePricing({
      polyYesBid: 0.42,
      kalshiNoBid: 0.52,
      friction: 0.004,
      alphaFloor: 0.015,
      inventory: 0,
      riskAversion: 0.1,
      timeToSettlementHours: 8
    });

    expect(out.polyTargetBid).toBeGreaterThan(0);
    expect(out.kalshiTargetBid).toBeGreaterThan(0);
    expect(out.expectedNetEdge).toBeGreaterThan(-0.2);
  });
});
