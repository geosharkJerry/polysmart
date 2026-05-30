"use client";

import { useEffect, useMemo, useState } from "react";

interface TrapRow {
  trapId: string;
  marketId: string;
  title: string;
  currentMarketPrice: number;
  projectedApy: number;
  allocatedUsd: number;
  aiConfidence: number;
  settlementEtaHours: number;
  status: "SCANNING" | "DEPLOYED" | "FORCE_LIQUIDATED" | "CLEARED";
}

interface TrapSnapshot {
  antiLockupCeilingUsd: number;
  currentExposureUsd: number;
  bufferCapitalUsd: number;
  maxAllowedPoolExposureUsd: number;
  activeTraps: TrapRow[];
  liquidatedTraps: TrapRow[];
  lastFlashLiquidation: {
    triggered: boolean;
    withinSla: boolean;
    elapsedMs: number;
    requiredUsd: number;
    reclaimedUsd: number;
    remainingShortfallUsd: number;
    liquidatedMarkets: string[];
  } | null;
}

const EMPTY: TrapSnapshot = {
  antiLockupCeilingUsd: 0,
  currentExposureUsd: 0,
  bufferCapitalUsd: 0,
  maxAllowedPoolExposureUsd: 0,
  activeTraps: [],
  liquidatedTraps: [],
  lastFlashLiquidation: null
};

export function SettlementTrapWidget() {
  const [snapshot, setSnapshot] = useState<TrapSnapshot>(EMPTY);
  const [status, setStatus] = useState("Ready");
  const [emergencyNeed, setEmergencyNeed] = useState(150000);

  const loadSnapshot = async () => {
    const res = await fetch("/api/risk/settlement-trap");
    const data = (await res.json()) as TrapSnapshot;
    setSnapshot(data);
  };

  useEffect(() => {
    loadSnapshot().catch(() => setStatus("Failed to load settlement trap dashboard."));
  }, []);

  const runScan = async () => {
    setStatus("Scanning tail-settlement contracts...");
    const res = await fetch("/api/risk/settlement-trap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "scan" })
    });
    const data = await res.json();
    setSnapshot(data.snapshot as TrapSnapshot);
    setStatus(`Scan done. Newly deployed: ${data.result?.deployed?.length ?? 0}`);
  };

  const runFlashLiquidation = async () => {
    setStatus("Triggering redemption-driven flash liquidation...");
    const res = await fetch("/api/risk/settlement-trap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flash-liquidation", requiredUsd: emergencyNeed })
    });
    const data = await res.json();
    setSnapshot(data.snapshot as TrapSnapshot);
    const withinSla = data.report?.withinSla ? "YES" : "NO";
    setStatus(`Flash liquidation complete. SLA <=50ms: ${withinSla}`);
  };

  const antiLockupRatio = useMemo(() => {
    if (snapshot.antiLockupCeilingUsd <= 0) return "0.0";
    return ((snapshot.currentExposureUsd / snapshot.antiLockupCeilingUsd) * 100).toFixed(1);
  }, [snapshot.antiLockupCeilingUsd, snapshot.currentExposureUsd]);

  return (
    <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Idle Liquidity Harvester (Settlement Liquidity Trap)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Level 4 silent strategy for deterministic near-settlement contracts with anti-lockup and flash-redemption safety rails.
          </p>
        </div>
        <span className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">LEVEL 4</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <p className="text-xs uppercase text-slate-500">Buffer Capital</p>
          <p className="mt-2 text-xl font-semibold text-ink">${snapshot.bufferCapitalUsd.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-emerald-50 p-4">
          <p className="text-xs uppercase text-slate-500">Active Exposure</p>
          <p className="mt-2 text-xl font-semibold text-ink">${snapshot.currentExposureUsd.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-orange-50 p-4">
          <p className="text-xs uppercase text-slate-500">Anti-Lockup Ceiling</p>
          <p className="mt-2 text-xl font-semibold text-ink">${snapshot.antiLockupCeilingUsd.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-rose-50 p-4">
          <p className="text-xs uppercase text-slate-500">Ceiling Utilization</p>
          <p className="mt-2 text-xl font-semibold text-ink">{antiLockupRatio}%</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={runScan}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Scan & Deploy Traps
        </button>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Emergency Withdrawal Need (USD)
          </label>
          <input
            type="number"
            min={1}
            value={emergencyNeed}
            onChange={(e) => setEmergencyNeed(Number(e.target.value))}
            className="w-60 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={runFlashLiquidation}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Run Flash Liquidation Drill
        </button>
        <p className="text-sm text-slate-600">{status}</p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sky-100 text-slate-500">
              <th className="py-2">Trap</th>
              <th className="py-2">Entry Price</th>
              <th className="py-2">Projected APY</th>
              <th className="py-2">Allocated USD</th>
              <th className="py-2">AI Confidence</th>
              <th className="py-2">ETA (h)</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.activeTraps.map((trap) => (
              <tr key={trap.trapId} className="border-b border-slate-100 text-slate-700">
                <td className="py-3">
                  <p className="font-semibold">{trap.trapId}</p>
                  <p className="max-w-[32rem] text-xs text-slate-500">{trap.title}</p>
                </td>
                <td className="py-3 font-mono">{trap.currentMarketPrice.toFixed(3)}</td>
                <td className="py-3 font-semibold text-emerald-700">{(trap.projectedApy * 100).toFixed(1)}%</td>
                <td className="py-3">${trap.allocatedUsd.toLocaleString()}</td>
                <td className="py-3">{(trap.aiConfidence * 100).toFixed(2)}%</td>
                <td className="py-3">{trap.settlementEtaHours.toFixed(1)}</td>
                <td className="py-3">
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{trap.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
