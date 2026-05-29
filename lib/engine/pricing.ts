import { PricingInput, PricingOutput } from "@/lib/types";

const clamp01 = (v: number) => Math.max(0.01, Math.min(0.99, v));

export function computePricing(input: PricingInput): PricingOutput {
  const syntheticMid = (input.polyYesBid + (1 - input.kalshiNoBid)) / 2;
  const normalizedTime = Math.max(0.05, Math.min(1, input.timeToSettlementHours / 24));
  const inventoryPenalty = input.riskAversion * input.inventory * normalizedTime;
  const reservationPrice = clamp01(syntheticMid - inventoryPenalty);

  const safety = input.alphaFloor + input.friction;
  const polyTargetBid = clamp01(reservationPrice - safety / 2);
  const kalshiTargetBid = clamp01((1 - reservationPrice) - safety / 2);

  const arbitrageSpread = (1 - input.kalshiNoBid) - input.polyYesBid;
  const expectedNetEdge = arbitrageSpread - input.friction;

  return {
    syntheticMid,
    reservationPrice,
    polyTargetBid,
    kalshiTargetBid,
    arbitrageSpread,
    expectedNetEdge
  };
}
