import { T0Event } from "@/lib/types";

export interface RawMarket {
  id: string;
  platform: T0Event["platform"];
  title: string;
  category: T0Event["category"];
  endTimeUtc: string;
  edgeSpreadPct: number;
  aiWinProbability: number;
}

export function filterT0Markets(markets: RawMarket[], now: Date, maxHours = 24): T0Event[] {
  const maxTime = new Date(now.getTime() + maxHours * 60 * 60 * 1000).getTime();
  const nowMs = now.getTime();

  return markets.filter((market) => {
    const t = new Date(market.endTimeUtc).getTime();
    return Number.isFinite(t) && t >= nowMs && t <= maxTime;
  });
}
