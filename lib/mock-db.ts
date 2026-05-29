import { BillingProfile, PlatformConfig, SettlementLedger, T0Event } from "./types";

const now = new Date();
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

export const platformConfig: PlatformConfig = {
  scrapeFrequencyMinutes: 15
};

export const t0Events: T0Event[] = [
  {
    id: "EVT-001",
    platform: "Polymarket",
    title: "Will U.S. PCE inflation print below 2.8% today?",
    category: "Macro",
    endTimeUtc: inHours(4),
    edgeSpreadPct: 3.4,
    aiWinProbability: 0.76
  },
  {
    id: "EVT-002",
    platform: "Kalshi",
    title: "Will a Fed governor deliver a hawkish speech by market close?",
    category: "Politics",
    endTimeUtc: inHours(6),
    edgeSpreadPct: 2.2,
    aiWinProbability: 0.68
  },
  {
    id: "EVT-003",
    platform: "PredictIt",
    title: "Will the committee advance the bill in today's hearing?",
    category: "Regulation",
    endTimeUtc: inHours(8),
    edgeSpreadPct: 4.1,
    aiWinProbability: 0.81
  }
];

export const billingProfiles: Record<string, BillingProfile> = {
  "user-alpha": {
    userId: "user-alpha",
    billingMode: "SUBSCRIPTION",
    settlementFrequency: "DAILY",
    volumeFeeRate: 0.015,
    rentExpiresAt: "2026-12-31T23:59:59Z",
    totalTradedVolumeUsd: 253400,
    pscBalance: 4860,
    accountStatus: "active"
  },
  "user-beta": {
    userId: "user-beta",
    billingMode: "PERFORMANCE",
    settlementFrequency: "EVENT_END",
    volumeFeeRate: 0.015,
    rentExpiresAt: null,
    totalTradedVolumeUsd: 92600,
    pscBalance: 0,
    accountStatus: "active"
  }
};

export const settlementLedgers: SettlementLedger[] = [
  {
    id: "SET-801",
    userId: "user-alpha",
    mode: "SUBSCRIPTION",
    eventId: "EVT-001",
    tradedVolumeUsd: 38000,
    platformRevenueUsd: 570,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "SET-802",
    userId: "user-beta",
    mode: "PERFORMANCE",
    eventId: "EVT-003",
    tradedVolumeUsd: 22000,
    platformRevenueUsd: 1440,
    timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString()
  }
];
