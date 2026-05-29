"use client";

import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { BillingProfile, MatrixAccount, RiskMetrics, SettlementLedger } from "@/lib/types";

export default function AdminPage() {
  const [users, setUsers] = useState<BillingProfile[]>([]);
  const [settlements, setSettlements] = useState<SettlementLedger[]>([]);
  const [accounts, setAccounts] = useState<MatrixAccount[]>([]);
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [poolNav, setPoolNav] = useState(0);
  const [poolAssets, setPoolAssets] = useState(0);
  const [poolMembers, setPoolMembers] = useState(0);
  const [status, setStatus] = useState("Loading...");

  const load = async () => {
    const [usersRes, settlementRes, accountsRes, riskRes, poolRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/settlements"),
      fetch("/api/accounts"),
      fetch("/api/risk/status"),
      fetch("/api/pool/nav")
    ]);

    const usersData: { users: BillingProfile[] } = await usersRes.json();
    const settlementData: { settlements: SettlementLedger[] } = await settlementRes.json();
    const accountData: { accounts: MatrixAccount[] } = await accountsRes.json();
    const riskData: RiskMetrics = await riskRes.json();
    const poolData: { pool: { nav: number; totalAssetsUsd: number }; members: unknown[] } = await poolRes.json();

    setUsers(usersData.users);
    setSettlements(settlementData.settlements);
    setAccounts(accountData.accounts);
    setRisk(riskData);
    setPoolNav(poolData.pool.nav);
    setPoolAssets(poolData.pool.totalAssetsUsd);
    setPoolMembers(poolData.members.length);
    setStatus("Synced with runtime API data.");
  };

  useEffect(() => {
    load().catch(() => {
      setStatus("Failed to load admin data.");
    });
  }, []);

  const totals = useMemo(() => {
    const volume = settlements.reduce((acc, row) => acc + row.tradedVolumeUsd, 0);
    const revenue = settlements.reduce((acc, row) => acc + row.platformRevenueUsd, 0);
    return { volume, revenue };
  }, [settlements]);

  const depositPool = async () => {
    await fetch("/api/pool/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-alpha", amountUsd: 5000 })
    });
    await load();
  };

  const settleEvent = async () => {
    await fetch("/api/pool/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-alpha", eventId: "EVT-001", netProfitUsd: 1200 })
    });
    await load();
  };

  const emergencyWithdraw = async () => {
    await fetch("/api/pool/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-beta", action: "withdraw" })
    });
    await load();
  };

  return (
    <main>
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-10">
        <div className="rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">Polysmart Backoffice Management</h1>
          <p className="mt-2 text-sm text-slate-600">
            Unified operations for subscriptions, settlement frequencies, account matrix health, and pool-level risk posture.
          </p>

          <div className="mt-7 grid gap-5 md:grid-cols-4">
            <div className="rounded-2xl border border-sky-100 bg-white p-5">
              <p className="text-xs uppercase text-slate-500">Users in Matrix</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{users.length}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5">
              <p className="text-xs uppercase text-slate-500">Settled Volume</p>
              <p className="mt-2 text-3xl font-semibold text-ink">${totals.volume.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5">
              <p className="text-xs uppercase text-slate-500">Platform Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-ink">${totals.revenue.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5">
              <p className="text-xs uppercase text-slate-500">Risk State</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{risk?.status ?? "N/A"}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-600">{status}</p>
        </div>

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Asset Pool and Emergency Liquidity Buffer</h2>
            <div className="flex gap-2">
              <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={depositPool}>
                Deposit +$5,000
              </button>
              <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={settleEvent}>
                Settle Event +$1,200
              </button>
              <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={emergencyWithdraw}>
                Emergency Withdraw
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3 text-sm text-slate-700">
            <p>NAV: <span className="font-semibold">{poolNav.toFixed(6)}</span></p>
            <p>Total Assets: <span className="font-semibold">${poolAssets.toLocaleString()}</span></p>
            <p>Pool Members: <span className="font-semibold">{poolMembers}</span></p>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Matrix Account Health</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 text-slate-500">
                  <th className="py-2">Account</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Platform</th>
                  <th className="py-2">Proxy</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Last Health Check</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((row) => (
                  <tr key={row.accountId} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3">{row.accountId}</td>
                    <td className="py-3">{row.userId}</td>
                    <td className="py-3">{row.platform}</td>
                    <td className="py-3">{row.proxyUrl}</td>
                    <td className="py-3">{row.status}</td>
                    <td className="py-3">{new Date(row.lastHealthCheckAt).toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Subscription and Billing Profiles</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 text-slate-500">
                  <th className="py-2">User</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Settlement</th>
                  <th className="py-2">Volume Fee</th>
                  <th className="py-2">Performance Fee</th>
                  <th className="py-2">PSC Balance</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Traded Volume</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.userId} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3">{row.userId}</td>
                    <td className="py-3">{row.billingMode}</td>
                    <td className="py-3">{row.settlementFrequency}</td>
                    <td className="py-3">{(row.volumeFeeRate * 100).toFixed(2)}%</td>
                    <td className="py-3">{(row.performanceFeeRate * 100).toFixed(1)}%</td>
                    <td className="py-3">{row.pscBalance.toLocaleString()}</td>
                    <td className="py-3">{row.accountStatus}</td>
                    <td className="py-3">${row.totalTradedVolumeUsd.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-sky-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Settlement and Revenue Ledger</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 text-slate-500">
                  <th className="py-2">Settlement ID</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Event</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Traded Volume</th>
                  <th className="py-2">Platform Revenue</th>
                  <th className="py-2">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3">{row.id}</td>
                    <td className="py-3">{row.userId}</td>
                    <td className="py-3">{row.eventId}</td>
                    <td className="py-3">{row.mode}</td>
                    <td className="py-3">${row.tradedVolumeUsd.toLocaleString()}</td>
                    <td className="py-3 text-sky">${row.platformRevenueUsd.toLocaleString()}</td>
                    <td className="py-3">{new Date(row.timestamp).toISOString()}</td>
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
