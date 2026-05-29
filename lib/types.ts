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

export interface RiskMetrics {
  inventoryDeviationPct: number;
  hedgeLatencyMs: number;
  slippagePct: number;
  blockedAccounts: number;
  status: "NORMAL" | "CIRCUIT_BREAKER";
  reason: string | null;
  updatedAt: string;
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
