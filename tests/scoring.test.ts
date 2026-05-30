import { describe, expect, it } from "vitest";
import { computeCompositeScore } from "@/lib/engine/scoring";

describe("computeCompositeScore", () => {
  it("returns bounded composite score", () => {
    const out = computeCompositeScore({
      impactScore: 0.8,
      probabilityEdge: 0.7,
      liquidityScore: 0.9,
      timeDecay: 0.4,
      riskScore: 0.2,
      executionCost: 0.3
    });

    expect(out.composite).toBeGreaterThanOrEqual(0);
    expect(out.composite).toBeLessThanOrEqual(1);
  });
});
