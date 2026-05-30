import { NextRequest, NextResponse } from "next/server";
import {
  getSettlementTrapSnapshot,
  scanSettlementLiquidityTraps,
  triggerRedemptionDrivenFlashLiquidation
} from "@/lib/services/settlement-trap";

export async function GET() {
  return NextResponse.json(getSettlementTrapSnapshot());
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const action = String(payload.action || "scan");

  if (action === "scan") {
    const result = scanSettlementLiquidityTraps();
    return NextResponse.json({
      action,
      result,
      snapshot: getSettlementTrapSnapshot()
    });
  }

  if (action === "flash-liquidation") {
    const requiredUsd = Number(payload.requiredUsd);
    if (!Number.isFinite(requiredUsd) || requiredUsd <= 0) {
      return NextResponse.json({ message: "requiredUsd must be positive" }, { status: 400 });
    }
    const report = triggerRedemptionDrivenFlashLiquidation(requiredUsd);
    return NextResponse.json({
      action,
      report,
      snapshot: getSettlementTrapSnapshot()
    });
  }

  return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
}
