import { NextRequest, NextResponse } from "next/server";
import { settlePoolEvent } from "@/lib/services/risk-pool";
import { settlePerformance } from "@/lib/services/billing";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const userId = String(payload.userId || "");
  const eventId = String(payload.eventId || "EVENT_SETTLED");
  const netProfitUsd = Number(payload.netProfitUsd);

  if (!userId || !Number.isFinite(netProfitUsd)) {
    return NextResponse.json({ message: "Invalid settlement payload" }, { status: 400 });
  }

  const poolResult = settlePoolEvent(userId, netProfitUsd);
  if ("error" in poolResult) {
    return NextResponse.json({ message: poolResult.error }, { status: 404 });
  }

  const feeResult = settlePerformance(userId, eventId, netProfitUsd);
  if ("error" in feeResult) {
    return NextResponse.json({ message: feeResult.error }, { status: 404 });
  }

  return NextResponse.json({
    pool: poolResult,
    billing: feeResult
  });
}
