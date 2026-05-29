import { describe, expect, it } from "vitest";
import { processTradeVolumeCharge, settlePerformance } from "@/lib/services/billing";

describe("billing service", () => {
  it("deducts subscription volume fee", () => {
    const out = processTradeVolumeCharge("user-alpha", 1000, "EVT-test");
    expect(out.code).toBe("VOLUME_FEE_SUCCESS");
  });

  it("settles performance fee for performance mode user", () => {
    const out = settlePerformance("user-beta", "EVT-x", 500);
    if ("error" in out) {
      throw new Error(out.error);
    }
    expect(out.feeUsd).toBeGreaterThan(0);
  });
});
