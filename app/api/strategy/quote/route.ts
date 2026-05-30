import { NextRequest, NextResponse } from "next/server";
import { computePricing } from "@/lib/engine/pricing";
import { shouldAmendOrder } from "@/lib/engine/rate-reducer";
import { sliceOrderAcrossAccounts } from "@/lib/engine/order-slicer";
import { computeCompositeScore } from "@/lib/engine/scoring";
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

  const score = computeCompositeScore({
    impactScore: Number(payload.impactScore ?? Math.min(1, Math.abs(pricing.arbitrageSpread) * 20)),
    probabilityEdge: Number(payload.probabilityEdge ?? Math.min(1, Math.max(0, pricing.expectedNetEdge * 18 + 0.5))),
    liquidityScore: Number(payload.liquidityScore ?? 0.62),
    timeDecay: Number(payload.timeDecay ?? Math.min(1, (24 - Number(payload.timeToSettlementHours ?? 6)) / 24)),
    riskScore: Number(payload.riskScore ?? Math.min(1, Math.abs(Number(payload.inventory ?? 0)))),
    executionCost: Number(payload.executionCost ?? Math.min(1, Number(payload.friction ?? 0.004) * 30))
  });

  return NextResponse.json({ pricing, reduce, score, allocations });
}
