import { describe, expect, it } from "vitest";
import { applyHealingTransition, deriveHealingActions } from "@/lib/engine/self-healing";

describe("self healing", () => {
  it("produces defense actions on leg timeout", () => {
    const actions = deriveHealingActions(
      {
        inventoryDeviationPct: 0.3,
        hedgeLatencyMs: 1200,
        slippagePct: 0.002,
        blockedAccounts: 0,
        status: "CIRCUIT_BREAKER",
        reason: "LEG_IN_TIMEOUT",
        updatedAt: new Date().toISOString()
      },
      {
        mode: "NORMAL",
        reason: null,
        lastTransitionAt: new Date().toISOString()
      }
    );

    const state = applyHealingTransition(
      { mode: "NORMAL", reason: null, lastTransitionAt: new Date().toISOString() },
      actions
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(["DEFENSE", "RECOVERY", "HALTED"]).toContain(state.mode);
  });
});
