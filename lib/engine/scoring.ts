import { CompositeScoreBreakdown, ScoreInput } from "@/lib/types";

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export function computeCompositeScore(input: ScoreInput): CompositeScoreBreakdown {
  const impact = clamp(input.impactScore);
  const edge = clamp(input.probabilityEdge);
  const liquidity = clamp(input.liquidityScore);
  const decay = clamp(input.timeDecay);
  const risk = clamp(input.riskScore);
  const cost = clamp(input.executionCost);

  const composite =
    impact * 0.24 + edge * 0.26 + liquidity * 0.18 + decay * 0.12 + (1 - risk) * 0.12 + (1 - cost) * 0.08;

  return {
    impactScore: impact,
    probabilityEdge: edge,
    liquidityScore: liquidity,
    timeDecay: decay,
    riskScore: risk,
    executionCost: cost,
    composite: Number(clamp(composite).toFixed(6))
  };
}
