"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppInput, AppLinkButton, DataTable, PanelSection, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";

type RiskSnapshot = {
  risk: { inventoryDeviationPct: number; hedgeLatencyMs: number; slippagePct: number; blockedAccounts: number; anomalyScore: number; anomalyFlags: string[]; status: string; reason: string | null; updatedAt: string; };
  healing: { mode: string; reason: string | null; lastTransitionAt: string; };
  logs: Array<{ id: string; category: string; message: string; context: Record<string, unknown>; createdAt: string; }>;
};

type TrapSnapshot = {
  antiLockupCeilingUsd: number; currentExposureUsd: number; bufferCapitalUsd: number; maxAllowedPoolExposureUsd: number;
  activeTraps: Array<{ trapId: string; marketId: string; title: string; currentMarketPrice: number; projectedApy: number; allocatedUsd: number; aiConfidence: number; settlementEtaHours: number; status: string; }>;
  liquidatedTraps: Array<{ trapId: string; marketId: string; title: string; currentMarketPrice: number; projectedApy: number; allocatedUsd: number; aiConfidence: number; settlementEtaHours: number; status: string; }>;
  lastFlashLiquidation: null | { triggered: boolean; withinSla: boolean; elapsedMs: number; requiredUsd: number; reclaimedUsd: number; remainingShortfallUsd: number; liquidatedMarkets: string[]; };
};

function toneForRiskStatus(s: string) {
  if (s === "NORMAL") return "success" as const;
  if (s === "CIRCUIT_BREAKER" || s === "BLOCKED") return "danger" as const;
  if (s === "DEFENSE" || s === "RECOVERY") return "warning" as const;
  return "info" as const;
}
function toneForHealingMode(m: string) {
  if (m === "NORMAL") return "success" as const;
  if (m === "HALTED") return "danger" as const;
  if (m === "DEFENSE" || m === "RECOVERY") return "warning" as const;
  return "info" as const;
}

export function AdminRiskWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status, setWorkspace } = useAdminWorkspace();
  const [riskSnapshot, setRiskSnapshot] = useState<RiskSnapshot | null>(null);
  const [riskStatus, setRiskStatus] = useState("Risk snapshot not loaded yet.");
  const [trapSnapshot, setTrapSnapshot] = useState<TrapSnapshot | null>(null);
  const [trapStatus, setTrapStatus] = useState("Settlement trap snapshot not loaded yet.");
  const [trapNeed, setTrapNeed] = useState(150000);
  const [scanBusy, setScanBusy] = useState(false);
  const [liquidationBusy, setLiquidationBusy] = useState(false);
  const [healingBusy, setHealingBusy] = useState(false);
  const [healingStatus, setHealingStatus] = useState("No healing action has been run yet.");
  const readValue = (e: ChangeEvent<HTMLInputElement>) => e.target.value;

  const summary = useMemo(() => ({ activeTraps: trapSnapshot?.activeTraps.length ?? 0, liquidatedTraps: trapSnapshot?.liquidatedTraps.length ?? 0, recentLogs: riskSnapshot?.logs.length ?? 0 }), [riskSnapshot?.logs.length, trapSnapshot?.activeTraps.length, trapSnapshot?.liquidatedTraps.length]);
  const currentHealing = riskSnapshot?.healing ?? { mode: workspace.risk.status === "NORMAL" ? "NORMAL" : "DEFENSE", reason: workspace.risk.reason, lastTransitionAt: workspace.risk.updatedAt };

  const loadSnapshots = async () => {
    const [riskRes, trapRes, workspaceRes] = await Promise.all([
      fetch("/api/risk/status", { cache: "no-store" }),
      fetch("/api/risk/settlement-trap", { cache: "no-store" }),
      fetch("/api/admin/workspace", { cache: "no-store" })
    ]);
    if (workspaceRes.ok) { const payload = await workspaceRes.json(); setWorkspace(payload); }
    if (riskRes.ok) { setRiskSnapshot((await riskRes.json()) as RiskSnapshot); setRiskStatus("Risk snapshot refreshed."); }
    if (trapRes.ok) { setTrapSnapshot((await trapRes.json()) as TrapSnapshot); setTrapStatus("Settlement trap snapshot refreshed."); }
  };

  const runHealing = async () => {
    setHealingBusy(true); setHealingStatus("Applying risk healing...");
    try {
      const res = await fetch("/api/risk/circuit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryDeviationPct: workspace.risk.inventoryDeviationPct, hedgeLatencyMs: workspace.risk.hedgeLatencyMs, slippagePct: workspace.risk.slippagePct, blockedAccounts: workspace.risk.blockedAccounts }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const payload = await res.json().catch(() => ({ message: "Risk healing failed." }));
      if (!res.ok) { setHealingStatus(payload.message || "Risk healing failed."); return; }
      setRiskSnapshot(payload as RiskSnapshot);
      setHealingStatus("Healing " + (payload.healing?.mode ?? "updated") + " · " + (payload.healing?.reason ?? "no reason"));
      await loadSnapshots();
    } finally { setHealingBusy(false); }
  };

  const scanTraps = async () => {
    setScanBusy(true); setTrapStatus("Scanning settlement traps...");
    try {
      const res = await fetch("/api/risk/settlement-trap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan" }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const payload = await res.json().catch(() => ({ message: "Trap scan failed." }));
      if (!res.ok) { setTrapStatus(payload.message || "Trap scan failed."); return; }
      setTrapSnapshot(payload.snapshot as TrapSnapshot);
      setTrapStatus("Trap scan complete · deployed " + (payload.result?.deployed?.length ?? 0));
      await loadSnapshots();
    } finally { setScanBusy(false); }
  };

  const flashLiquidation = async () => {
    setLiquidationBusy(true); setTrapStatus("Running flash liquidation drill...");
    try {
      const res = await fetch("/api/risk/settlement-trap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "flash-liquidation", requiredUsd: trapNeed }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const payload = await res.json().catch(() => ({ message: "Flash liquidation failed." }));
      if (!res.ok) { setTrapStatus(payload.message || "Flash liquidation failed."); return; }
      setTrapSnapshot(payload.snapshot as TrapSnapshot);
      setTrapStatus("Flash liquidation " + (payload.report?.triggered ? "triggered" : "skipped") + " · SLA " + (payload.report?.withinSla ? "met" : "missed"));
      await loadSnapshots();
    } finally { setLiquidationBusy(false); }
  };

  return (
    <AdminShell admin={admin} title="Risk Workspace" description="Inspect risk-engine posture, drive circuit-breaker healing transitions, and deploy settlement traps from one operator surface." status={status}
      badges={[{ label: workspace.risk.status, tone: toneForRiskStatus(workspace.risk.status) }, { label: currentHealing.mode, tone: toneForHealingMode(currentHealing.mode) }, { label: summary.activeTraps + " active traps", tone: summary.activeTraps > 0 ? "warning" : "info" }, { label: summary.liquidatedTraps + " liquidated", tone: summary.liquidatedTraps > 0 ? "danger" : "info" }]}
      statusNote="This workspace is the primary operator surface for risk-engine posture, circuit-breaker healing, and settlement trap deployment."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Engine Status" value={workspace.risk.status} tone={toneForRiskStatus(workspace.risk.status) === 'success' ? 'emerald' : toneForRiskStatus(workspace.risk.status) === 'danger' ? 'rose' : toneForRiskStatus(workspace.risk.status) === 'warning' ? 'amber' : 'slate'} />
        <StatTile label="Active Traps" value={summary.activeTraps} tone="amber" />
        <StatTile label="Liquidated" value={summary.liquidatedTraps} tone="rose" />
        <StatTile label="Risk Logs" value={summary.recentLogs} tone="slate" />
      </div>

      <WorkspaceCluster eyebrow="Risk operations" title="Engine posture, healing, and settlement trap deployment" description="Drive circuit-breaker transitions, inspect trap deployment exposure, and review anomaly posture." mt={7}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <div className="grid gap-6">
            <PanelSection title="Risk-engine snapshot" description="Inspect the latest risk-engine posture including inventory deviation, hedge latency, and anomaly flags." eyebrow="Engine lane">
              <ActionBar mt={0} status={<span className="text-xs text-slate-500">{riskStatus}</span>}>
                <AppButton className="text-sm" onClick={loadSnapshots}>Refresh Risk Snapshot</AppButton>
              </ActionBar>
              {riskSnapshot ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SettingsInset eyebrow="Inventory deviation" title={(riskSnapshot.risk.inventoryDeviationPct * 100).toFixed(2) + "%"} description="Deviation pct at last check"><div /></SettingsInset>
                  <SettingsInset eyebrow="Hedge latency" title={riskSnapshot.risk.hedgeLatencyMs + "ms"} description="Latency at last check"><div /></SettingsInset>
                  <SettingsInset eyebrow="Slippage" title={(riskSnapshot.risk.slippagePct * 100).toFixed(2) + "%"}><div /></SettingsInset>
                  <SettingsInset eyebrow="Blocked accounts" title={String(riskSnapshot.risk.blockedAccounts)}><div /></SettingsInset>
                  {riskSnapshot.risk.anomalyFlags.length > 0 ? (
                    <SettingsInset eyebrow="Anomaly flags" title={riskSnapshot.risk.anomalyFlags.join(", ")} description={"Score " + riskSnapshot.risk.anomalyScore.toFixed(2)}><div /></SettingsInset>
                  ) : null}
                </div>
              ) : <div className="empty-state mt-4">No risk snapshot loaded yet.</div>}
            </PanelSection>

            <PanelSection title="Circuit-breaker healing" description="Trigger a circuit-breaker healing transition and review the updated risk-engine state." eyebrow="Healing lane">
              <ActionBar mt={0} status={<span className="text-xs text-slate-500">{healingStatus}</span>}>
                <AppButton className="text-sm" disabled={healingBusy} onClick={runHealing}>Run Healing Transition</AppButton>
              </ActionBar>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SettingsInset eyebrow="Healing mode" title={currentHealing.mode} description={currentHealing.reason ?? "No reason"}><div /></SettingsInset>
                <SettingsInset eyebrow="Last transition" title={currentHealing.lastTransitionAt ? new Date(currentHealing.lastTransitionAt).toLocaleString() : "N/A"}><div /></SettingsInset>
              </div>
            </PanelSection>

            <PanelSection title="Risk audit log" description="Recent risk-engine log entries." eyebrow="Log lane">
              <div className="grid gap-2">
                {(riskSnapshot?.logs ?? []).slice(0, 5).map((log) => (
                  <div key={log.id} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-xs">
                    <p className="font-semibold text-slate-900">{log.message}</p>
                    <p className="mt-1 text-slate-500">{log.category} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {(riskSnapshot?.logs ?? []).length === 0 ? <div className="empty-state">No risk logs available.</div> : null}
              </div>
            </PanelSection>
          </div>

          <div className="grid gap-6">
            <PanelSection title="Settlement trap deployment" description="Scan for deployment opportunities, inspect exposure vs ceiling, and run redemption-driven flash liquidation drills." eyebrow="Trap lane">
              <ActionBar mt={0} status={<span className="text-xs text-slate-500">{trapStatus}</span>}>
                <AppButton className="text-sm" variant="outline" disabled={scanBusy} onClick={scanTraps}>Scan Traps</AppButton>
                <AppButton className="text-sm" disabled={liquidationBusy} onClick={flashLiquidation}>Flash Liquidation</AppButton>
              </ActionBar>
              <div className="mt-4"><p className="text-xs font-semibold text-slate-500">Required liquidation USD</p><AppInput type="number" min={1} value={trapNeed} onChange={(e) => setTrapNeed(Number(readValue(e)))} className="mt-2" /></div>
              {trapSnapshot ? (
                <div className="mt-4 grid gap-3">
                  <SettingsInset eyebrow="Anti-lockup ceiling" title={"$" + trapSnapshot.antiLockupCeilingUsd.toLocaleString()} description={"Current exposure $" + trapSnapshot.currentExposureUsd.toLocaleString() + " · Buffer $" + trapSnapshot.bufferCapitalUsd.toLocaleString()}><div /></SettingsInset>
                  <p className="text-xs font-semibold text-slate-500 mt-2">Active traps</p>
                  <div className="grid gap-2">
                    {trapSnapshot.activeTraps.slice(0, 5).map((t) => (
                      <div key={t.trapId} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-xs">
                        <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{t.title}</p><p className="mt-1 text-slate-500">{t.marketId}</p></div><StatusBadge label={t.status} tone="warning" /></div>
                        <div className="mt-2 grid gap-2 md:grid-cols-3"><p>Price {t.currentMarketPrice}</p><p>APY {(t.projectedApy * 100).toFixed(1)}%</p><p>Allocated $" + t.allocatedUsd.toLocaleString() + "</p></div>
                      </div>
                    ))}
                  </div>
                  {trapSnapshot.lastFlashLiquidation ? (
                    <SettingsInset eyebrow="Last flash liquidation" title={trapSnapshot.lastFlashLiquidation.triggered ? "Triggered" : "Skipped"} description={trapSnapshot.lastFlashLiquidation.withinSla ? "SLA met · " + trapSnapshot.lastFlashLiquidation.elapsedMs + "ms" : "SLA missed"}><div /></SettingsInset>
                  ) : null}
                </div>
              ) : <div className="empty-state mt-4">No trap snapshot loaded yet.</div>}
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
