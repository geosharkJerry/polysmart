"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionBar, PanelSection, SettingsInset, WorkspaceCluster , AppButton, AppInput, AppLinkButton, AppSelect, TableCell, TableRow } from "@/components/dashboard-sections";

type OnchainFundingRecord = {
  id: string;
  accountId: string;
  userId: string;
  userName: string;
  accountLabel: string;
  platform: string;
  walletAddress: string;
  walletChain: string;
  asset: string;
  amount: number;
  txHash: string;
  confirmedAt: string;
};

type PermissionAuditRecord = {
  id: string;
  accountId: string;
  source: string;
  canTrade: boolean;
  canQuery: boolean;
  grantedPermissions: string[];
  walletBalance: number;
  fundingThresholdUsd: number;
  reason: string;
  createdAt: string;
};

type OnchainSyncPayload = {
  results: Array<{
    account?: {
      accountId: string;
      label: string;
      platform: string;
      walletBalance: number;
      canTrade: boolean;
      canQuery: boolean;
      lastFundingSyncAt?: string | null;
    };
    fundingRecords?: OnchainFundingRecord[];
    error?: string;
  }>;
  anchor?: {
    id: string;
    digest: string;
    signature: string;
    chainId: string;
    blockNumber: string;
    createdAt: string;
  };
};

export function AdminOnchainSyncWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status, load } = useAdminWorkspace();
  const [records, setRecords] = useState<OnchainFundingRecord[]>(workspace.fundingRecords as OnchainFundingRecord[]);
  const [audits, setAudits] = useState<PermissionAuditRecord[]>(workspace.accountPermissionAudits as PermissionAuditRecord[]);
  const [anchor, setAnchor] = useState<OnchainSyncPayload["anchor"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No onchain sync has been run yet.");

  const summary = useMemo(
    () => ({
      fundingRecords: records.length,
      permissionAudits: audits.length,
      tradeEnabled: workspace.accounts.filter((row) => row.canTrade).length,
      queryEnabled: workspace.accounts.filter((row) => row.canQuery).length
    }),
    [audits.length, records.length, workspace.accounts]
  );

  useEffect(() => {
    setRecords(workspace.fundingRecords as OnchainFundingRecord[]);
    setAudits(workspace.accountPermissionAudits as PermissionAuditRecord[]);
  }, [workspace.accountPermissionAudits, workspace.fundingRecords]);

  const runSync = async () => {
    setBusy(true);
    setMessage("Running full funding sync and audit anchor...");
    try {
      const res = await fetch("/api/onchain/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = (await res.json().catch(() => ({ message: "Onchain sync failed." }))) as OnchainSyncPayload & { message?: string };
      if (!res.ok) {
        setMessage(payload.message || "Onchain sync failed.");
        return;
      }
      setAnchor(payload.anchor ?? null);
      setMessage(`Onchain sync completed · ${(payload.results ?? []).length} account result(s).`);
      const latestWorkspace = await load();
      if (latestWorkspace) {
        setRecords(latestWorkspace.fundingRecords as OnchainFundingRecord[]);
        setAudits(latestWorkspace.accountPermissionAudits as PermissionAuditRecord[]);
      }
    } finally {
      setBusy(false);
    }
  };

  const refreshEvidence = async () => {
    const latestWorkspace = await load();
    if (latestWorkspace) {
      setRecords(latestWorkspace.fundingRecords as OnchainFundingRecord[]);
      setAudits(latestWorkspace.accountPermissionAudits as PermissionAuditRecord[]);
      setMessage("Evidence refreshed from the admin workspace.");
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Onchain Sync Workspace"
      description="Run the full wallet-funding synchronization flow, capture the audit anchor, and inspect the resulting funding and permission evidence."
      status={status}
      badges={[
        { label: `${summary.fundingRecords} funding records`, tone: "info" },
        { label: `${summary.permissionAudits} permission audits`, tone: "info" },
        { label: `${summary.tradeEnabled} trade-enabled`, tone: "success" }
      ]}
      statusNote="This workspace exposes the API-backed onchain sync flow as a first-class operational page instead of a hidden endpoint."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Funding records" value={summary.fundingRecords} />
        <StatTile label="Permission audits" value={summary.permissionAudits} tone="emerald" />
        <StatTile label="Query enabled" value={summary.queryEnabled} tone="amber" />
        <StatTile label="Trade enabled" value={summary.tradeEnabled} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Onchain operations"
        title="Funding sync runner, audit anchor, and permission evidence"
        description="Run the wallet-funding synchronization workflow, collect the latest chain anchor, and review funding as well as permission-side evidence from one operator surface."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <PanelSection
            title="Sync runner"
            description="Trigger a full funding sweep and append a new audit anchor for the current onchain state."
            eyebrow="Action lane"
          >
            <ActionBar mt={0} status={<span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}>
              <AppButton className="text-sm" disabled={busy} onClick={runSync}>{busy ? "Syncing..." : "Run Onchain Sync"}</AppButton>
              <AppButton className="text-sm" variant="outline" onClick={refreshEvidence}>Refresh Evidence</AppButton>
            </ActionBar>

            <SettingsInset mt={4} eyebrow="Audit anchor" title={anchor?.id ?? "No audit anchor captured yet."} description={anchor ? `${anchor.chainId} · block ${anchor.blockNumber}` : "Run an onchain sync to generate the latest funding anchor."}>
              {anchor ? (
                <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <p>Digest: <span className="break-all font-semibold text-slate-900 dark:text-white">{anchor.digest}</span></p>
                  <p>Signature: <span className="break-all font-semibold text-slate-900 dark:text-white">{anchor.signature}</span></p>
                  <p suppressHydrationWarning>Captured {new Date(anchor.createdAt).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">No audit anchor has been recorded in this session yet.</p>
              )}
            </SettingsInset>
          </PanelSection>

          <PanelSection
            title="Funding evidence"
            description="Inspect the latest funding rows and permission decisions produced by the most recent onchain sync."
            eyebrow="Evidence lane"
          >
            <div className="grid gap-4">
              <SettingsInset eyebrow="Wallet funding records" title={`${records.length} rows`} description="Latest transfer-detection rows sourced from the funding sweep." actions={<StatusBadge label={records.length > 0 ? "loaded" : "empty"} tone={records.length > 0 ? "info" : "warning"} />}>
                <div className="grid gap-3">
                  {records.slice(0, 5).map((row) => (
                    <SettingsInset key={row.id} eyebrow={`${row.accountId} · ${row.walletChain}`} title={`$${row.amount.toLocaleString()} · ${row.asset}`} description={`${row.platform} · ${row.accountLabel}`}>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{row.userName} · {row.txHash}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>Confirmed {new Date(row.confirmedAt).toLocaleString()}</p>
                    </SettingsInset>
                  ))}
                  {records.length === 0 ? <div className="empty-state">No funding records have been loaded yet.</div> : null}
                </div>
              </SettingsInset>

              <SettingsInset eyebrow="Permission audits" title={`${audits.length} rows`} description="Latest trade and query permission decisions derived from wallet funding posture." actions={<StatusBadge label={audits.length > 0 ? "loaded" : "empty"} tone={audits.length > 0 ? "info" : "warning"} />}>
                <div className="grid gap-3">
                  {audits.slice(0, 5).map((row) => (
                    <SettingsInset key={row.id} eyebrow={`${row.accountId} · ${row.source}`} title={row.reason} description={`Wallet balance $${row.walletBalance.toLocaleString()} · threshold $${row.fundingThresholdUsd.toLocaleString()}`}>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Query {row.canQuery ? "enabled" : "blocked"} · Trade {row.canTrade ? "enabled" : "blocked"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>{new Date(row.createdAt).toLocaleString()}</p>
                    </SettingsInset>
                  ))}
                  {audits.length === 0 ? <div className="empty-state">No permission audits have been loaded yet.</div> : null}
                </div>
              </SettingsInset>
            </div>
          </PanelSection>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
