import { runtimeState } from "@/lib/store";
import { filterT0Markets, RawMarket } from "@/lib/engine/t0-filter";

export function listEvents() {
  return runtimeState.events;
}

export function refreshT0Pool(markets: RawMarket[]) {
  runtimeState.events = filterT0Markets(markets, new Date(), 24);
  return runtimeState.events;
}
