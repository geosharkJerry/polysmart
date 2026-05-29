export type BillingMode = "PERFORMANCE" | "SUBSCRIPTION";
export type SettlementFrequency = "EVENT_END" | "DAILY" | "WEEKLY";

export interface BillingProfile {
  userId: string;
  billingMode: BillingMode;
  settlementFrequency: SettlementFrequency;
  volumeFeeRate: number;
  rentExpiresAt: string | null;
  totalTradedVolumeUsd: number;
  pscBalance: number;
  accountStatus: "active" | "quota_exhausted";
}

export interface T0Event {
  id: string;
  platform: "Polymarket" | "Kalshi" | "PredictIt";
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
}
