import { ExecutionSimInput, ExecutionSimOutput } from "@/lib/types";

export function simulateExecution(input: ExecutionSimInput): ExecutionSimOutput {
  const timeline: string[] = ["QUOTE_PLACED"];

  if (!input.legAFilled) {
    timeline.push("IDLE_REQUOTE");
    return {
      state: "FAILED",
      timeline,
      realizedEdgePct: 0
    };
  }

  timeline.push("LEG_A_FILLED");
  if (input.legBFillDelayMs <= input.timeoutMs) {
    timeline.push("LEG_B_FILLED_MAKER");
    return {
      state: "LOCKED",
      timeline,
      realizedEdgePct: 0.018
    };
  }

  timeline.push("LEG_B_TIMEOUT");
  timeline.push("FORCED_TAKER_HEDGE");

  const edgeAfterForced = 0.018 - input.forcedTakerCostPct;
  return {
    state: edgeAfterForced > -0.01 ? "FORCED_HEDGE" : "FAILED",
    timeline,
    realizedEdgePct: Number(edgeAfterForced.toFixed(4))
  };
}
