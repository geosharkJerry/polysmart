import { HealingAction, RiskMetrics, SelfHealingState } from "@/lib/types";

export function deriveHealingActions(risk: RiskMetrics, state: SelfHealingState): HealingAction[] {
  if (risk.status === "NORMAL") {
    if (state.mode === "DEFENSE" || state.mode === "HALTED" || state.mode === "RECOVERY") {
      return [{ action: "RESUME_TRADING", reason: "risk normalized" }];
    }
    return [];
  }

  if (risk.reason === "LEG_IN_TIMEOUT") {
    return [
      { action: "PAUSE_QUOTES", reason: "hedge timeout risk" },
      { action: "DELEVERAGE", reason: "reduce inventory mismatch" }
    ];
  }

  if (risk.reason === "SLIPPAGE_COLLAPSE") {
    return [
      { action: "PAUSE_QUOTES", reason: "slippage collapse" },
      { action: "REBALANCE", reason: "liquidity rebalance" }
    ];
  }

  return [{ action: "HALT_TRADING", reason: "connector blocked or unknown systemic risk" }];
}

export function applyHealingTransition(state: SelfHealingState, actions: HealingAction[]): SelfHealingState {
  if (actions.length === 0) {
    return state;
  }

  const hasHalt = actions.some((x) => x.action === "HALT_TRADING");
  const hasResume = actions.some((x) => x.action === "RESUME_TRADING");

  let mode: SelfHealingState["mode"] = state.mode;
  if (hasResume) {
    mode = "NORMAL";
  } else if (hasHalt) {
    mode = "HALTED";
  } else {
    mode = state.mode === "NORMAL" ? "DEFENSE" : "RECOVERY";
  }

  return {
    mode,
    reason: actions.map((x) => `${x.action}:${x.reason}`).join(" | "),
    lastTransitionAt: new Date().toISOString()
  };
}
