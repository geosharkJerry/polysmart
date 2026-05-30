import { NextRequest, NextResponse } from "next/server";
import { computeCompositeScore } from "@/lib/engine/scoring";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const fields = [
    "impactScore",
    "probabilityEdge",
    "liquidityScore",
    "timeDecay",
    "riskScore",
    "executionCost"
  ] as const;

  const input = {
    impactScore: Number(payload.impactScore),
    probabilityEdge: Number(payload.probabilityEdge),
    liquidityScore: Number(payload.liquidityScore),
    timeDecay: Number(payload.timeDecay),
    riskScore: Number(payload.riskScore),
    executionCost: Number(payload.executionCost)
  };

  if (fields.some((k) => !Number.isFinite(input[k]))) {
    return NextResponse.json({ message: "all score fields must be finite numbers" }, { status: 400 });
  }

  return NextResponse.json(computeCompositeScore(input));
}
