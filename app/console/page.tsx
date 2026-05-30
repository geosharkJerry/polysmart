"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { SettlementTrapWidget } from "@/components/SettlementTrapWidget";
import { BillingProfile, MatrixAccount, RiskMetrics, T0Event } from "@/lib/types";

const defaultProfile: BillingProfile = {
  userId: "user-alpha",
  billingMode: "SUBSCRIPTION",
  settlementFrequency: "DAILY",
  volumeFeeRate: 0.015,
  performanceFeeRate: 0.2,
  rentExpiresAt: null,
  totalTradedVolumeUsd: 0,
  pscBalance: 0,
  accountStatus: "active"
};

const defaultRisk: RiskMetrics = {
  inventoryDeviationPct: 0,
  hedgeLatencyMs: 0,
  slippagePct: 0,
  blockedAccounts: 0,
  status: "NORMAL",
  reason: null,
  updatedAt: new Date().toISOString()
};

export default function ConsolePage() {
  const [profile, setProfile] = useState<BillingProfile>(defaultProfile);
  const [billingMode, setBillingMode] = useState(defaultProfile.billingMode);
  const [volumeFee, setVolumeFee] = useState(defaultProfile.volumeFeeRate);
  const [scrapeFrequency, setScrapeFrequency] = useState(15);
  const [events, setEvents] = useState<T0Event[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [tradeVolume, setTradeVolume] = useState(10000);
  const [chargeMessage, setChargeMessage] = useState("");
  const [quoteResult, setQuoteResult] = useState<string>("");
  const [risk, setRisk] = useState<RiskMetrics>(defaultRisk);
  const [accounts, setAccounts] = useState<MatrixAccount[]>([]);
  const [accountStatus, setAccountStatus] = useState("");

  const [newAccount, setNewAccount] = useState({
    platform: "kalshi",
    label: "",
    proxyUrl: "",
    apiKey: ""
  });

  const boot = async () => {
    const [profileRes, eventsRes, configRes, riskRes, accountRes] = await Promise.all([
      fetch("/api/billing/profile/user-alpha"),
      fetch("/api/events"),
      fetch("/api/config"),
      fetch("/api/risk/status"),
      fetch("/api/accounts")
    ]);

    const profileData: BillingProfile = await profileRes.json();
    const eventsData: { events: T0Event[] } = await eventsRes.json();
    const configData: { scrapeFrequencyMinutes: number } = await configRes.json();
    const riskData: RiskMetrics = await riskRes.json();
    const accountData: { accounts: MatrixAccount[] } = await accountRes.json();

    setProfile(profileData);
    setBillingMode(profileData.billingMode);
    setVolumeFee(profileData.volumeFeeRate);
    setEvents(eventsData.events);
    setScrapeFrequency(configData.scrapeFrequencyMinutes);
    setRisk(riskData);
    setAccounts(accountData.accounts);
  };

  useEffect(() => {
    boot().catch(() => {
      setSaveMessage("Failed to load initial configuration.");
    });
  }, []);

  const avgWinRate = useMemo(() => {
    if (!events.length) {
      return "0.0";
    }
    return ((events.reduce((acc, e) => acc + e.aiWinProbability, 0) / events.length) * 100).toFixed(1);
  }, [events]);

  const saveConfig = async () => {
    setSaveMessage("Saving...");

    const [profileRes, configRes] = await Promise.all([
      fetch("/api/billing/profile/user-alpha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingMode, volumeFeeRate: volumeFee })
      }),
      fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrapeFrequencyMinutes: scrapeFrequency })
      })
    ]);

    if (!profileRes.ok || !configRes.ok) {
      setSaveMessage("Save failed. Check values and retry.");
      return;
    }

    const updated: BillingProfile = await profileRes.json();
    setProfile(updated);
    setSaveMessage("Configuration saved.");
  };

  const triggerCharge = async () => {
    setChargeMessage("Charging...");
    const res = await fetch("/api/trades/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "user-alpha",
        executedVolumeUsd: tradeVolume,
        eventId: events[0]?.id ?? "MANUAL"
      })
    });

    const payload = await res.json();
    if (!res.ok) {
      setChargeMessage(payload.message || "Charge failed.");
      return;
    }

    setChargeMessage(payload.code);
    if (payload.profile) {
      setProfile(payload.profile);
    }
  };

  const runQuoteSimulation = async () => {
    const res = await fetch("/api/strategy/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polyYesBid: 0.46,
        kalshiNoBid: 0.48,
        inventory: 0.2,
        totalOrderUsd: 12000,
        timeToSettlementHours: 6
      })
    });
    const payload = await res.json();
    setQuoteResult(
      `PolyBid ${payload.pricing.polyTargetBid.toFixed(3)} | KalshiBid ${payload.pricing.kalshiTargetBid.toFixed(3)} | Amend=${payload.reduce.shouldAmend}`
    );
  };

  const evaluateRisk = async () => {
    const res = await fetch("/api/risk/circuit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventoryDeviationPct: 0.24,
        hedgeLatencyMs: 1700,
        slippagePct: 0.008,
        blockedAccounts: 0
      })
    });
    const payload = await res.json();
    setRisk(payload);
  };

  const bindMatrixAccount = async () => {
    setAccountStatus("Binding...");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "user-alpha",
        platform: newAccount.platform,
        label: newAccount.label,
        proxyUrl: newAccount.proxyUrl,
        credentials: { apiKey: newAccount.apiKey }
      })
    });

    const payload = await res.json();
    if (!res.ok) {
      setAccountStatus(payload.message || "Bind failed");
      return;
    }

    setAccountStatus(`Bound: ${payload.account.accountId} (${payload.health})`);
    await boot();
  };

  return (
    <main>
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-10">
        <div className="rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">Polysmart Commercial Control Panel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Unified console for T+0 event harvesting, matrix account orchestration, billing, and circuit-breaker risk controls.
          </p>

          <div className="mt-7 grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs uppercase text-slate-500">T+0 Active Events</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{events.length}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-emerald-50 p-5">
              <p className="text-xs uppercase text-slate-500">Average AI Win Probability</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{avgWinRate}%</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-orange-50 p-5">
              <p className="text-xs uppercase text-slate-500">KYC Matrix Health</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{accounts.filter((a) => a.status !== "disabled").length}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-rose-50 p-5">
              <p className="text-xs uppercase text-slate-500">Risk State</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{risk.status}</p>
            </div>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Billing and Capture Configuration</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Monetization Mode</label>
              <select
                value={billingMode}
                onChange={(e) => setBillingMode(e.target.value as "PERFORMANCE" | "SUBSCRIPTION")}
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
              >
                <option value="PERFORMANCE">Managed Performance Sharing (20% profit split)</option>
                <option value="SUBSCRIPTION">AI Agent Subscription (volume service fee)</option>
              </select>
            </div>

            {billingMode === "SUBSCRIPTION" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Volume Service Fee</label>
                  <span className="font-mono text-sm font-semibold text-sky">{(volumeFee * 100).toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.03"
                  step="0.001"
                  value={volumeFee}
                  onChange={(e) => setVolumeFee(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-sky-100 accent-[#1f6feb]"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">T+0 Refresh Interval (minutes)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={scrapeFrequency}
                onChange={(e) => setScrapeFrequency(Number(e.target.value))}
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveConfig}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Save Configuration
            </button>
            <button
              type="button"
              onClick={evaluateRisk}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Run Circuit-Breaker Drill
            </button>
            <p className="text-sm text-slate-600">{saveMessage || `Risk reason: ${risk.reason ?? "none"}`}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <div className="rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Subscription Charge Simulator</h2>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Executed Volume (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  value={tradeVolume}
                  onChange={(e) => setTradeVolume(Number(e.target.value))}
                  className="w-48 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={triggerCharge}
                className="rounded-xl bg-sky px-4 py-2 text-sm font-semibold text-white"
              >
                Apply Volume Fee
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-700">
              <p>Status: {chargeMessage}</p>
              <p>PSC Balance: {profile.pscBalance.toLocaleString()}</p>
              <p>Total Traded Volume: ${profile.totalTradedVolumeUsd.toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Quote + Hedge Simulation</h2>
            <p className="mt-2 text-sm text-slate-600">Runs pricing, rate reducer, and matrix order slicing in one step.</p>
            <button
              type="button"
              onClick={runQuoteSimulation}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Run Strategy Simulation
            </button>
            <p className="mt-3 text-sm text-slate-700">{quoteResult}</p>
          </div>
        </div>

        <SettlementTrapWidget />

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Account Matrix Binding</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <select
              value={newAccount.platform}
              onChange={(e) => setNewAccount({ ...newAccount, platform: e.target.value })}
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
            >
              <option value="polymarket">Polymarket</option>
              <option value="kalshi">Kalshi</option>
              <option value="predictit">PredictIt</option>
            </select>
            <input
              value={newAccount.label}
              onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
              placeholder="Account label"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={newAccount.proxyUrl}
              onChange={(e) => setNewAccount({ ...newAccount, proxyUrl: e.target.value })}
              placeholder="Proxy URL"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={newAccount.apiKey}
              onChange={(e) => setNewAccount({ ...newAccount, apiKey: e.target.value })}
              placeholder="API key / token"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={bindMatrixAccount}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Bind Account
            </button>
            <p className="text-sm text-slate-700">{accountStatus}</p>
          </div>
          <p className="mt-3 text-sm text-slate-600">Active accounts: {accounts.length}</p>
        </div>

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Live T+0 Opportunity Pool</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 text-slate-500">
                  <th className="py-2">Platform</th>
                  <th className="py-2">Market</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">AI Win Prob.</th>
                  <th className="py-2">Spread Edge</th>
                  <th className="py-2">Settlement (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3">{event.platform}</td>
                    <td className="py-3">{event.title}</td>
                    <td className="py-3">{event.category}</td>
                    <td className="py-3">{(event.aiWinProbability * 100).toFixed(1)}%</td>
                    <td className="py-3 text-mint">+{event.edgeSpreadPct.toFixed(1)}%</td>
                    <td className="py-3">{new Date(event.endTimeUtc).toLocaleString("en-US", { timeZone: "UTC" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
