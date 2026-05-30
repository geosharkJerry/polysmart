import { createDefaultMockConnectors } from "@/lib/connectors/mock-connectors";
import {
  AccountPlatform,
  ConnectorOrderRequest,
  ConnectorOrderResult,
  MarketConnector,
  OrderBookSnapshot
} from "@/lib/types";

const connectors: Record<AccountPlatform, MarketConnector> = createDefaultMockConnectors();

export function getConnector(platform: AccountPlatform): MarketConnector {
  return connectors[platform];
}

export async function healthCheckAllConnectors() {
  const rows = await Promise.all(
    (Object.keys(connectors) as AccountPlatform[]).map((platform) => connectors[platform].healthCheck())
  );
  return rows;
}

export async function fetchOrderBook(platform: AccountPlatform, marketId: string): Promise<OrderBookSnapshot> {
  return connectors[platform].getOrderBook(marketId);
}

export async function placeConnectorOrder(
  platform: AccountPlatform,
  request: ConnectorOrderRequest
): Promise<ConnectorOrderResult> {
  return connectors[platform].placeOrder(request);
}

export async function cancelConnectorOrder(platform: AccountPlatform, externalOrderId: string) {
  return connectors[platform].cancelOrder(externalOrderId);
}

export async function pollConnectorFill(platform: AccountPlatform, externalOrderId: string) {
  return connectors[platform].pollFill(externalOrderId);
}
