import { describe, expect, it } from "vitest";
import { buildRelayPlan } from "@/lib/engine/privacy-relay";

describe("privacy relay plan", () => {
  it("splits total across wallets without loss", () => {
    const plan = buildRelayPlan(1000, ["w1", "w2", "w3"]);
    const total = plan.slices.reduce((acc, s) => acc + s.amountUsd, 0);
    expect(total).toBeCloseTo(1000, 2);
    expect(plan.slices.length).toBe(3);
  });
});
