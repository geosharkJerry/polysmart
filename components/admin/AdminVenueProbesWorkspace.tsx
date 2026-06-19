"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionBar, PanelSection, SettingsInset, WorkspaceCluster , AppButton, AppInput, AppLinkButton, AppSelect, TableCell, TableRow } from "@/components/dashboard-sections";

type VenueProbeRecord = {
  id: string;
  platform: string;
  mode: string;
  healthy: boolean;
  latencyMs: number;
  message: string;
  credentialsConfigured: boolean;
  kycSatisfied: boolean;
  queryPermissionOk: boolean;
  tradePermissionOk: boolean;
  rateLimitOk: boolean;
  rateLimitWindowMs: number;
  probeSource: string;
  boundAccountCount: number;
  verifiedAccountCount: number;
  queryEnabledCount: number;
  tradeEnabledCount: number;
  createdAt: string;
};

export function AdminVenueProbesWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [records, setRecords] = useState<VenueProbeRecord[]>(workspace.connectorProbeLogs as VenueProbeRecord[]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No venue probe has been run yet.");

  const summary = useMemo(
    () => ({
      total: records.length,
      healthy: records.filter((row) => row.healthy).length,
      live: records.filter((row) => row.mode === "live").length,
      permissionReady: records.filter((row) => row.queryPermissionOk && row.tradePermissionOk).length
    }),
    [records]
  );

  const loadRecords = async () => {
    const res = await fetch("/api/admin/venue-probes", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setMessage("Failed to load venue probes.");
      return;
    }
    const payload = await res.json().catch(() => ({ records: [] }));
    setRecords(Array.isArray(payload.records) ? payload.records : []);
  };

  const runProbe = async () => {
    setBusy(true);
    setMessage("Running venue probe...");
    try {
      const res = await fetch("/api/admin/venue-probes", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ message: "Venue probe failed." }));
      if (!res.ok) {
        setMessage(payload.message || "Venue probe failed.");
        return;
      }
      setRecords((payload.records ?? []) as VenueProbeRecord[]);
      setMessage(`Venue probe completed · ${(payload.records ?? []).length} rows.`);
      await loadRecords();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Venue Probes Workspace"
      description="Run connector health probes across Polymarket, Kalshi, and PredictIt, then inspect live permission evidence and rate-limit posture."
      status={status}
      badges={[
        { label: `${summary.total} probes`, tone: "info" },
        { label: `${summary.healthy} healthy`, tone: "success" },
        { label: `${summary.live} live`, tone: "info" }
      ]}
      statusNote="This workspace is dedicated to venue-level health evidence, account-readiness posture, and permission validation."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Probes" value={summary.total} />
        <StatTile label="Healthy" value={summary.healthy} tone="emerald" />
        <StatTile label="Live" value={summary.live} tone="amber" />
        <StatTile label="Ready" value={summary.permissionReady} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Venue validation"
        title="Connector probe runner and venue readiness evidence"
        description="Run venue-level health checks and review whether account inventory, permissions, and rate limits are ready for production routing."
        mt={7}
      >
        <PanelSection
          title="Connector probe runner"
          description="Launch a fresh venue probe across supported connectors and record the latest evidence set."
          eyebrow="Probe lane"
        >
          <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}>
            <AppButton className="text-sm" disabled={busy} onClick={runProbe}>{busy ? "Running..." : "Run Venue Probe"}</AppButton>
            <AppButton className="text-sm" variant="outline" onClick={loadRecords}>Refresh Records</AppButton>
          </ActionBar>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {records.map((row) => (
              <SettingsInset
                key={row.id}
                eyebrow={`${row.platform} · ${row.mode}`}
                title={`${row.latencyMs}ms · ${row.probeSource}`}
                description={row.message}
                actions={<StatusBadge label={row.healthy ? "healthy" : "unavailable"} tone={row.healthy ? "success" : "danger"} />}
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300">Bound / verified: <span className="font-semibold text-slate-900 dark:text-white">{row.boundAccountCount} / {row.verifiedAccountCount}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Query / trade: <span className="font-semibold text-slate-900 dark:text-white">{row.queryEnabledCount} / {row.tradeEnabledCount}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">KYC satisfied: <span className="font-semibold text-slate-900 dark:text-white">{row.kycSatisfied ? "yes" : "no"}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Rate window: <span className="font-semibold text-slate-900 dark:text-white">{row.rateLimitWindowMs}ms</span></p>
                </div>
              </SettingsInset>
            ))}
            {records.length === 0 ? <div className="empty-state">No venue probes recorded yet.</div> : null}
          </div>
        </PanelSection>
      </WorkspaceCluster>
    </AdminShell>
  );
}
