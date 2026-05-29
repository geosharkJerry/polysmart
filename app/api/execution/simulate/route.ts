import { NextRequest, NextResponse } from "next/server";
import { simulateExecution } from "@/lib/engine/execution-state-machine";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = simulateExecution({
    timeoutMs: Number(payload.timeoutMs ?? 800),
    legAFilled: Boolean(payload.legAFilled ?? true),
    legBFillDelayMs: Number(payload.legBFillDelayMs ?? 600),
    forcedTakerCostPct: Number(payload.forcedTakerCostPct ?? 0.005)
  });

  return NextResponse.json(result);
}
