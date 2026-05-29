import { describe, expect, it } from "vitest";
import { shouldAmendOrder } from "@/lib/engine/rate-reducer";

describe("shouldAmendOrder", () => {
  it("filters tiny moves and allows large moves", () => {
    const small = shouldAmendOrder({
      oldPrice: 0.5,
      newPrice: 0.501,
      inventoryAbs: 0.1,
      maxInventory: 1,
      remainingHours: 8
    });
    const big = shouldAmendOrder({
      oldPrice: 0.5,
      newPrice: 0.515,
      inventoryAbs: 0.1,
      maxInventory: 1,
      remainingHours: 8
    });

    expect(small.shouldAmend).toBe(false);
    expect(big.shouldAmend).toBe(true);
  });
});
