import { NextRequest, NextResponse } from "next/server";
import { evaluateAndApplyRisk } from "@/lib/services/risk-pool";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const metrics = {
    inventoryDeviationPct: Number(payload.inventoryDeviationPct),
    hedgeLatencyMs: Number(payload.hedgeLatencyMs),
    slippagePct: Number(payload.slippagePct),
    blockedAccounts: Number(payload.blockedAccounts)
  };

  if (Object.values(metrics).some((v) => !Number.isFinite(v) || v < 0)) {
    return NextResponse.json({ message: "Invalid risk metrics" }, { status: 400 });
  }

  return NextResponse.json(evaluateAndApplyRisk(metrics));
}
