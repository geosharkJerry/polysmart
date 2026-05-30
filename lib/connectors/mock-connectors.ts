import {
  AccountPlatform,
  ConnectorFillResult,
  ConnectorHealth,
  ConnectorOrderRequest,
  ConnectorOrderResult,
  MarketConnector,
  OrderBookSnapshot,
  OrderStatus
} from "@/lib/types";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

class MockConnector implements MarketConnector {
  platform: AccountPlatform;
  private orders = new Map<string, ConnectorOrderRequest>();

  constructor(platform: AccountPlatform) {
    this.platform = platform;
  }

  async getOrderBook(marketId: string): Promise<OrderBookSnapshot> {
    const center = rand(0.35, 0.65);
    const spread = rand(0.008, 0.03);
    return {
      marketId,
      platform: this.platform,
      bestYesBid: Number(Math.max(0.01, center - spread / 2).toFixed(4)),
      bestNoBid: Number(Math.max(0.01, 1 - center - spread / 2).toFixed(4)),
      spread: Number(spread.toFixed(4)),
      depthUsd: Number(rand(2000, 25000).toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }

  async placeOrder(request: ConnectorOrderRequest): Promise<ConnectorOrderResult> {
    const externalOrderId = `${this.platform.toUpperCase()}-${Math.floor(rand(100000, 999999))}`;
    this.orders.set(externalOrderId, request);
    return {
      externalOrderId,
      accepted: true
    };
  }

  async cancelOrder(externalOrderId: string): Promise<{ canceled: boolean }> {
    const canceled = this.orders.delete(externalOrderId);
    return { canceled };
  }

  async pollFill(externalOrderId: string): Promise<ConnectorFillResult> {
    const req = this.orders.get(externalOrderId);
    if (!req) {
      return {
        externalOrderId,
        filledUsd: 0,
        avgPrice: 0,
        status: "REJECTED",
        latencyMs: Number(rand(50, 300).toFixed(2))
      };
    }

    const fillRatio = rand(0.45, 1);
    const filledUsd = Number((req.notionalUsd * fillRatio).toFixed(2));
    const status: OrderStatus = fillRatio > 0.98 ? "FILLED" : "PARTIAL";
    if (status === "FILLED") {
      this.orders.delete(externalOrderId);
    }

    return {
      externalOrderId,
      filledUsd,
      avgPrice: req.price,
      status,
      latencyMs: Number(rand(40, 250).toFixed(2))
    };
  }

  async healthCheck(): Promise<ConnectorHealth> {
    return {
      platform: this.platform,
      healthy: true,
      latencyMs: Number(rand(30, 180).toFixed(2)),
      message: "mock connector healthy"
    };
  }
}

export function createDefaultMockConnectors(): Record<AccountPlatform, MarketConnector> {
  return {
    polymarket: new MockConnector("polymarket"),
    kalshi: new MockConnector("kalshi"),
    predictit: new MockConnector("predictit")
  };
}
