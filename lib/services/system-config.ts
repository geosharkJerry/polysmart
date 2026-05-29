import { runtimeState } from "@/lib/store";

export function getSystemConfig() {
  return runtimeState.config;
}

export function updateScrapeFrequency(minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
    return { error: "scrapeFrequencyMinutes must be between 1 and 60" } as const;
  }

  runtimeState.config.scrapeFrequencyMinutes = Math.round(minutes);
  return { config: runtimeState.config } as const;
}
