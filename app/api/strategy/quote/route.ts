import { NextRequest, NextResponse } from "next/server";
import { computePricing } from "@/lib/engine/pricing";
import { shouldAmendOrder } from "@/lib/engine/rate-reducer";
import { sliceOrderAcrossAccounts } from "@/lib/engine/order-slicer";
import { runtimeState } from "@/lib/store";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const pricing = computePricing({
    polyYesBid: Number(payload.polyYesBid),
    kalshiNoBid: Number(payload.kalshiNoBid),
    friction: Number(payload.friction ?? 0.004),
    alphaFloor: Number(payload.alphaFloor ?? runtimeState.config.alphaFloor),
    inventory: Number(payload.inventory ?? 0),
    riskAversion: Number(payload.riskAversion ?? 0.1),
    timeToSettlementHours: Number(payload.timeToSettlementHours ?? 6)
  });

  const reduce = shouldAmendOrder({
    oldPrice: Number(payload.oldPrice ?? pricing.polyTargetBid),
    newPrice: pricing.polyTargetBid,
    inventoryAbs: Math.abs(Number(payload.inventory ?? 0)),
    maxInventory: Number(payload.maxInventory ?? 1),
    remainingHours: Number(payload.timeToSettlementHours ?? 6)
  });

  const allocations = sliceOrderAcrossAccounts(
    Number(payload.totalOrderUsd ?? 1000),
    runtimeState.accounts
      .filter((acc) => acc.status !== "disabled")
      .map((acc) => ({
        accountId: acc.accountId,
        weight: acc.platform === "polymarket" ? 1.1 : 1,
        availableUsd: 5000
      }))
  );

  return NextResponse.json({ pricing, reduce, allocations });
}
