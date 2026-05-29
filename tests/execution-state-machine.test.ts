import { describe, expect, it } from "vitest";
import { simulateExecution } from "@/lib/engine/execution-state-machine";

describe("simulateExecution", () => {
  it("locks when opposite leg fills before timeout", () => {
    const out = simulateExecution({
      timeoutMs: 800,
      legAFilled: true,
      legBFillDelayMs: 300,
      forcedTakerCostPct: 0.004
    });

    expect(out.state).toBe("LOCKED");
    expect(out.timeline).toContain("LEG_B_FILLED_MAKER");
  });

  it("switches to forced hedge after timeout", () => {
    const out = simulateExecution({
      timeoutMs: 800,
      legAFilled: true,
      legBFillDelayMs: 1500,
      forcedTakerCostPct: 0.007
    });

    expect(out.timeline).toContain("FORCED_TAKER_HEDGE");
    expect(["FORCED_HEDGE", "FAILED"]).toContain(out.state);
  });
});
