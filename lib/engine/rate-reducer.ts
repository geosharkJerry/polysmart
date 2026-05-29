import { RateReducerInput, RateReducerOutput } from "@/lib/types";

export function shouldAmendOrder(input: RateReducerInput): RateReducerOutput {
  const minBase = input.minBaseThreshold ?? 0.005;
  const inventoryPressure = Math.min(1, input.inventoryAbs / Math.max(1e-6, input.maxInventory));
  const timePressure = 1 - Math.max(0.05, Math.min(1, input.remainingHours / 24));
  const threshold = minBase * (1 - 0.6 * inventoryPressure) * (1 - 0.35 * timePressure);

  const move = Math.abs(input.newPrice - input.oldPrice);
  return {
    shouldAmend: move >= Math.max(0.0005, threshold),
    threshold: Math.max(0.0005, threshold),
    move
  };
}
