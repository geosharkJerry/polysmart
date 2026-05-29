import { runtimeState } from "@/lib/store";

export const platformConfig = runtimeState.config;
export const t0Events = runtimeState.events;
export const billingProfiles = runtimeState.profiles;
export const settlementLedgers = runtimeState.settlements;
export const matrixAccounts = runtimeState.accounts;
export const poolState = runtimeState.poolState;
export const poolMembers = runtimeState.poolMembers;
export const riskState = runtimeState.risk;
