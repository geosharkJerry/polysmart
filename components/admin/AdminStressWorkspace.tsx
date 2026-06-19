"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppLinkButton, PanelSection, SettingsInset, WorkspaceCluster } from "@/components/dashboard-sections";

type StressScenarioResult = {
  scenario: string;
  result: {
    status: string;
    reason: string | null;
    inventoryDeviationPct: number;
    hedgeLatencyMs: number;
    slippagePct: number;
    blockedAccounts: number;
  };
};

export function AdminStressWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Stress scenarios not run yet.");
  const [results, setResults] = useState<StressScenarioResult[]>([]);

  const summary = useMemo(
    () => ({
      total: results.length,
      danger: results.filter((row) => row.result.status === "CIRCUIT_BREAKER" || row.result.status === "BLOCKED").length,
      warning: results.filter((row) => row.result.status === "DEFENSE" || row.result.status === "RECOVERY").length,
      normal: results.filter((row) => row.result.status === "NORMAL").length
    }),
    [results]
  );

  const runScenarios = async () => {
    setBusy(true);
    setStatus("Running stress scenarios...");
    try {
      const res = await fetch("/api/admin/stress/run", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ scenarios: [] }));
      if (!res.ok) {
        setStatus(payload.message || "Stress scenarios failed.");
        return;
      }
      setResults(Array.isArray(payload.scenarios) ? payload.scenarios : []);
      setStatus(`Stress scenarios completed · ${(payload.scenarios ?? []).length} results.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Stress Testing Workspace"
      description="Exercise the circuit-breaker engine against curated shock scenarios before the next release or risk policy change."
      status={status}
      badges={[
        { label: `${summary.total} scenarios`, tone: "info" },
        { label: `${summary.normal} normal`, tone: "success" },
        { label: `${summary.danger} critical`, tone: "danger" }
      ]}
      statusNote="This workspace is the dedicated operator surface for synthetic stress runs and remains separate from live risk monitoring."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Scenarios" value={summary.total} />
        <StatTile label="Normal" value={summary.normal} tone="emerald" />
        <StatTile label="Warnings" value={summary.warning} tone="amber" />
        <StatTile label="Critical" value={summary.danger} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Stress lab"
        title="Scenario runner and risk-engine outputs"
        description="Launch synthetic stress cases and review how the circuit-breaker engine responds to inventory deviation, latency, and slippage shocks."
        mt={7}
      >
        <PanelSection
          title="Scenario runner"
          description="Run the built-in stress scenarios and inspect the resulting risk-engine posture for each case."
          eyebrow="Simulation lane"
        >
          <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{status}</span>}>
            <AppButton className="text-sm" disabled={busy} onClick={runScenarios}>{busy ? "Running..." : "Run Stress Scenarios"}</AppButton>
          </ActionBar>

          <div className="mt-4 grid gap-3">
            {results.map((row) => (
              <SettingsInset
                key={row.scenario}
                eyebrow={row.scenario}
                title={row.result.reason ?? "No reason provided"}
                description={`Inventory ${(row.result.inventoryDeviationPct * 100).toFixed(2)}% · latency ${row.result.hedgeLatencyMs}ms · slippage ${(row.result.slippagePct * 100).toFixed(2)}%`}
                actions={<StatusBadge label={row.result.status} tone={row.result.status === "NORMAL" ? "success" : row.result.status === "DEFENSE" || row.result.status === "RECOVERY" ? "warning" : "danger"} />}
              >
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300">Inventory: <span className="font-semibold text-slate-900 dark:text-white">{(row.result.inventoryDeviationPct * 100).toFixed(2)}%</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Latency: <span className="font-semibold text-slate-900 dark:text-white">{row.result.hedgeLatencyMs}ms</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Slippage: <span className="font-semibold text-slate-900 dark:text-white">{(row.result.slippagePct * 100).toFixed(2)}%</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Blocked: <span className="font-semibold text-slate-900 dark:text-white">{row.result.blockedAccounts}</span></p>
                </div>
              </SettingsInset>
            ))}
            {results.length === 0 ? <div className="empty-state">No stress scenario runs yet.</div> : null}
          </div>
        </PanelSection>
      </WorkspaceCluster>
    </AdminShell>
  );
}
