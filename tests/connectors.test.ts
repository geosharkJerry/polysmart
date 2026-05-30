import { describe, expect, it } from "vitest";
import { fetchOrderBook, healthCheckAllConnectors, placeConnectorOrder, pollConnectorFill } from "@/lib/services/connectors";

describe("mock connectors", () => {
  it("provides health and orderbook", async () => {
    const health = await healthCheckAllConnectors();
    expect(health.length).toBe(3);

    const book = await fetchOrderBook("polymarket", "EVT-TEST");
    expect(book.marketId).toBe("EVT-TEST");
    expect(book.depthUsd).toBeGreaterThan(0);
  });

  it("places and polls order fill", async () => {
    const placed = await placeConnectorOrder("kalshi", {
      marketId: "EVT-TEST",
      side: "YES",
      price: 0.48,
      notionalUsd: 1200,
      orderType: "MAKER"
    });

    expect(placed.accepted).toBe(true);
    const fill = await pollConnectorFill("kalshi", placed.externalOrderId);
    expect(fill.filledUsd).toBeGreaterThanOrEqual(0);
  });
});
