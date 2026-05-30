export type BillingMode = "PERFORMANCE" | "SUBSCRIPTION";
export type SettlementFrequency = "EVENT_END" | "DAILY" | "WEEKLY";
export type AccountStatus = "active" | "quota_exhausted" | "suspended";
export type PlatformName = "Polymarket" | "Kalshi" | "PredictIt";
export type AccountPlatform = "polymarket" | "kalshi" | "predictit";

export interface BillingProfile {
  userId: string;
  billingMode: BillingMode;
  settlementFrequency: SettlementFrequency;
  volumeFeeRate: number;
  performanceFeeRate: number;
  rentExpiresAt: string | null;
  totalTradedVolumeUsd: number;
  pscBalance: number;
  accountStatus: AccountStatus;
}

export interface T0Event {
  id: string;
  platform: PlatformName;
  title: string;
  category: "Politics" | "Macro" | "Crypto" | "Regulation";
  endTimeUtc: string;
  edgeSpreadPct: number;
  aiWinProbability: number;
}

export interface SettlementLedger {
  id: string;
  userId: string;
  mode: BillingMode;
  eventId: string;
  tradedVolumeUsd: number;
  platformRevenueUsd: number;
  timestamp: string;
}

export interface PlatformConfig {
  scrapeFrequencyMinutes: number;
  alphaFloor: number;
  hedgeTimeoutMs: number;
  emergencyBufferRatio: number;
}

export interface MatrixAccount {
  accountId: string;
  userId: string;
  platform: AccountPlatform;
  label: string;
  proxyUrl: string;
  status: "healthy" | "degraded" | "disabled";
  lastHealthCheckAt: string;
}

export interface AccountCredential {
  accountId: string;
  platform: AccountPlatform;
  encryptedPayload: string;
  iv: string;
  authTag: string;
  keyVersion: string;
  createdAt: string;
}

export interface PoolMember {
  userId: string;
  shares: number;
  principalUsd: number;
  pnlUsd: number;
}

export interface AssetPoolState {
  totalAssetsUsd: number;
  liquidBufferUsd: number;
  totalShares: number;
  nav: number;
  emergencyPenaltyRate: number;
  updatedAt: string;
}

export type RiskStatus = "NORMAL" | "CIRCUIT_BREAKER";

export interface RiskMetrics {
  inventoryDeviationPct: number;
  hedgeLatencyMs: number;
  slippagePct: number;
  blockedAccounts: number;
  status: RiskStatus;
  reason: string | null;
  updatedAt: string;
}

export type SettlementTrapStatus = "SCANNING" | "DEPLOYED" | "FORCE_LIQUIDATED" | "CLEARED";

export interface SettlementTrapTarget {
  trapId: string;
  marketId: string;
  category: "CRYPTO" | "WEATHER" | "SPORTS" | "POLITICS" | "MACRO";
  title: string;
  targetContractType: "YES";
  currentMarketPrice: number;
  projectedApy: number;
  allocatedUsd: number;
  aiConfidence: number;
  settlementEtaHours: number;
  status: SettlementTrapStatus;
  createdAt: string;
  updatedAt: string;
  liquidatedAt: string | null;
}

export interface SettlementTrapConfig {
  idleBufferRatio: number;
  antiLockupCeilingRatio: number;
  hardExposureCapRatio: number;
  flashLiquidationSlaMs: number;
  minAskPrice: number;
  minAiConfidence: number;
}

export interface FlashLiquidationReport {
  triggered: boolean;
  withinSla: boolean;
  elapsedMs: number;
  requiredUsd: number;
  reclaimedUsd: number;
  remainingShortfallUsd: number;
  liquidatedMarkets: string[];
}

export interface PricingInput {
  polyYesBid: number;
  kalshiNoBid: number;
  friction: number;
  alphaFloor: number;
  inventory: number;
  riskAversion: number;
  timeToSettlementHours: number;
}

export interface PricingOutput {
  syntheticMid: number;
  reservationPrice: number;
  polyTargetBid: number;
  kalshiTargetBid: number;
  arbitrageSpread: number;
  expectedNetEdge: number;
}

export interface RateReducerInput {
  oldPrice: number;
  newPrice: number;
  inventoryAbs: number;
  maxInventory: number;
  remainingHours: number;
  minBaseThreshold?: number;
}

export interface RateReducerOutput {
  shouldAmend: boolean;
  threshold: number;
  move: number;
}

export interface ExecutionSimInput {
  timeoutMs: number;
  legAFilled: boolean;
  legBFillDelayMs: number;
  forcedTakerCostPct: number;
}

export interface ExecutionSimOutput {
  state: "LOCKED" | "FORCED_HEDGE" | "FAILED";
  timeline: string[];
  realizedEdgePct: number;
}

export interface QuoteAccount {
  accountId: string;
  weight: number;
  availableUsd: number;
}

export interface AllocationOutput {
  accountId: string;
  assignedUsd: number;
  jitterMs: number;
}

export interface RelayPlanSlice {
  wallet: string;
  amountUsd: number;
  delayMs: number;
}

export interface RelayPlan {
  totalUsd: number;
  slices: RelayPlanSlice[];
}

export type MarketSide = "YES" | "NO";
export type OrderType = "MAKER" | "TAKER";
export type OrderStatus = "PENDING" | "PARTIAL" | "FILLED" | "CANCELED" | "REJECTED";

export interface OrderIntentLeg {
  platform: AccountPlatform;
  marketId: string;
  side: MarketSide;
  notionalUsd: number;
  limitPrice: number;
  orderType: OrderType;
}

export interface ExecutionIntent {
  intentId: string;
  userId: string;
  eventId: string;
  status: "CREATED" | "LOCKED" | "EXECUTING" | "HEDGED" | "FAILED";
  createdAt: string;
  updatedAt: string;
  legs: OrderIntentLeg[];
}

export interface OrderRecord {
  orderId: string;
  intentId: string;
  userId: string;
  platform: AccountPlatform;
  marketId: string;
  side: MarketSide;
  orderType: OrderType;
  limitPrice: number;
  notionalUsd: number;
  filledUsd: number;
  status: OrderStatus;
  externalOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FillRecord {
  fillId: string;
  orderId: string;
  intentId: string;
  platform: AccountPlatform;
  filledUsd: number;
  avgPrice: number;
  latencyMs: number;
  createdAt: string;
}

export interface InventoryPosition {
  userId: string;
  eventId: string;
  yesExposureUsd: number;
  noExposureUsd: number;
  netExposureUsd: number;
  updatedAt: string;
}

export interface OrderBookSnapshot {
  marketId: string;
  platform: AccountPlatform;
  bestYesBid: number;
  bestNoBid: number;
  spread: number;
  depthUsd: number;
  timestamp: string;
}

export interface ConnectorOrderRequest {
  marketId: string;
  side: MarketSide;
  price: number;
  notionalUsd: number;
  orderType: OrderType;
}

export interface ConnectorOrderResult {
  externalOrderId: string;
  accepted: boolean;
  reason?: string;
}

export interface ConnectorFillResult {
  externalOrderId: string;
  filledUsd: number;
  avgPrice: number;
  status: OrderStatus;
  latencyMs: number;
}

export interface ConnectorHealth {
  platform: AccountPlatform;
  healthy: boolean;
  latencyMs: number;
  message: string;
}

export interface MarketConnector {
  platform: AccountPlatform;
  getOrderBook(marketId: string): Promise<OrderBookSnapshot>;
  placeOrder(request: ConnectorOrderRequest): Promise<ConnectorOrderResult>;
  cancelOrder(externalOrderId: string): Promise<{ canceled: boolean }>;
  pollFill(externalOrderId: string): Promise<ConnectorFillResult>;
  healthCheck(): Promise<ConnectorHealth>;
}

export type EventLevel = 1 | 2 | 3 | 4;
export type EventKind =
  | "ORDER_BOOK_UPDATE"
  | "TRADE_FILL"
  | "NEWS_EVENT"
  | "ONCHAIN_EVENT"
  | "SETTLEMENT_FUNDING"
  | "RISK_ALERT";

export interface BusEvent {
  id: string;
  level: EventLevel;
  kind: EventKind;
  eventId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  dedupeKey: string;
  deadlineAt: string;
}

export interface BusSlaPolicy {
  level: EventLevel;
  maxLatencyMs: number;
}

export interface BusLevelMetrics {
  processed: number;
  breaches: number;
  avgWaitMs: number;
  lastWaitMs: number;
}

export interface BusMetrics {
  queueDepth: number;
  processed: number;
  dropped: number;
  avgLatencyMs: number;
  level: Record<EventLevel, BusLevelMetrics>;
  updatedAt: string;
}

export interface ScoreInput {
  impactScore: number;
  probabilityEdge: number;
  liquidityScore: number;
  timeDecay: number;
  riskScore: number;
  executionCost: number;
}

export interface CompositeScoreBreakdown extends ScoreInput {
  composite: number;
}

export type SelfHealingMode = "NORMAL" | "DEFENSE" | "HALTED" | "RECOVERY";

export interface SelfHealingState {
  mode: SelfHealingMode;
  lastTransitionAt: string;
  reason: string | null;
}

export interface HealingAction {
  action: "PAUSE_QUOTES" | "DELEVERAGE" | "REBALANCE" | "HALT_TRADING" | "RESUME_TRADING";
  reason: string;
}

export interface AuditLog {
  id: string;
  category: "RISK" | "EXECUTION" | "BILLING" | "SYSTEM";
  message: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface InventoryLock {
  lockId: string;
  lockKey: string;
  userId: string;
  eventId: string;
  intentId: string;
  status: "ACTIVE" | "RELEASED" | "EXPIRED";
  leaseMs: number;
  acquiredAt: string;
  expiresAt: string;
  releasedAt: string | null;
}

export interface AtomicStep {
  name: "ACQUIRE_LOCK" | "PLACE_ORDERS" | "POLL_FILLS" | "COMPENSATE" | "FINALIZE" | "RELEASE_LOCK";
  status: "PENDING" | "SUCCESS" | "FAILED";
  message: string;
  timestamp: string;
}

export interface AtomicTransaction {
  txId: string;
  intentId: string;
  userId: string;
  eventId: string;
  status: "RUNNING" | "COMMITTED" | "ROLLED_BACK" | "FAILED";
  startedAt: string;
  endedAt: string | null;
  steps: AtomicStep[];
}
