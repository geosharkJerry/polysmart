import { describe, expect, it } from "vitest";
import { sliceOrderAcrossAccounts } from "@/lib/engine/order-slicer";

describe("sliceOrderAcrossAccounts", () => {
  it("distributes capital within account limits", () => {
    const out = sliceOrderAcrossAccounts(10000, [
      { accountId: "a", weight: 1, availableUsd: 3000 },
      { accountId: "b", weight: 2, availableUsd: 8000 }
    ]);

    const total = out.reduce((acc, row) => acc + row.assignedUsd, 0);
    expect(total).toBe(10000);
    expect(out.find((x) => x.accountId === "a")?.assignedUsd).toBeLessThanOrEqual(3000);
  });
});
