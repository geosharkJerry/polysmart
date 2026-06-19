"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionBar, FormField, FormGrid, PanelSection, SettingsInset, WorkspaceCluster , AppButton, AppInput, AppLinkButton, AppSelect, TableCell, TableRow } from "@/components/dashboard-sections";

type WalletProbeRecord = {
  id: string;
  accountId: string;
  chain: string;
  asset: string;
  walletAddress: string;
  rpcConfigured: boolean;
  tokenConfigured: boolean;
  rpcHealthy: boolean;
  latestBlock: number | null;
  tokenDecimals: number | null;
  balanceBefore: number;
  balanceAfter: number;
  detectedTransferCount: number;
  canTrade: boolean;
  canQuery: boolean;
  status: string;
  message: string;
  createdAt: string;
};

export function AdminWalletFundingProbesWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [records, setRecords] = useState<WalletProbeRecord[]>(workspace.walletFundingProbeLogs as WalletProbeRecord[]);
  const [accountId, setAccountId] = useState(workspace.accounts[0]?.accountId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No wallet probe has been run yet.");

  const summary = useMemo(
    () => ({
      total: records.length,
      success: records.filter((row) => row.status === "SUCCESS").length,
      pending: records.filter((row) => row.status === "PENDING").length,
      error: records.filter((row) => row.status === "ERROR").length
    }),
    [records]
  );

  const loadRecords = async () => {
    const res = await fetch("/api/admin/wallet-funding-probes", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setMessage("Failed to load wallet probes.");
      return;
    }
    const payload = await res.json().catch(() => ({ records: [] }));
    setRecords(Array.isArray(payload.records) ? payload.records : []);
  };

  const runProbe = async () => {
    setBusy(true);
    setMessage("Running wallet funding probe...");
    try {
      const res = await fetch("/api/admin/wallet-funding-probes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountId.trim() || undefined })
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ results: [], message: "Wallet probe failed." }));
      if (!res.ok) {
        setMessage(payload.message || "Wallet probe failed.");
        return;
      }
      setRecords((payload.results ?? []).flatMap((row: { record?: WalletProbeRecord }) => (row.record ? [row.record] : [])));
      setMessage(`Wallet probe completed · ${(payload.results ?? []).length} account result(s).`);
      await loadRecords();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Wallet Funding Probes Workspace"
      description="Run on-chain wallet funding probes, inspect unlock posture, and validate whether bound execution accounts have the chain-side permissions required for routing."
      status={status}
      badges={[
        { label: `${summary.total} probes`, tone: "info" },
        { label: `${summary.success} success`, tone: "success" },
        { label: `${summary.error} error`, tone: "danger" }
      ]}
      statusNote="This workspace isolates wallet-side funding validation from venue probing and broader production validation."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Probes" value={summary.total} />
        <StatTile label="Success" value={summary.success} tone="emerald" />
        <StatTile label="Pending" value={summary.pending} tone="amber" />
        <StatTile label="Error" value={summary.error} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Wallet validation"
        title="Funding probe runner and wallet-side readiness evidence"
        description="Select an execution account, run a wallet funding probe, and inspect RPC health, transfer detection, and trade unlock posture."
        mt={7}
      >
        <PanelSection
          title="Wallet probe runner"
          description="Pick a bound account and validate chain connectivity, token posture, and funding-triggered permission unlocks."
          eyebrow="Probe lane"
        >
          <FormGrid columns={{ base: 1, md: 2 }} gap={4}>
            <FormField label="Account">
              <AppInput value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder={workspace.accounts[0]?.accountId ?? "account id"} />
            </FormField>
            <SettingsInset eyebrow="Latest status" title={message} description="The probe status is updated after each wallet sync run."><div /></SettingsInset>
          </FormGrid>

          <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">Wallet probes are read-only diagnostics until live funding automation is enabled.</span>}>
            <AppButton className="text-sm" disabled={busy} onClick={runProbe}>{busy ? "Running..." : "Run Wallet Probe"}</AppButton>
            <AppButton className="text-sm" variant="outline" onClick={loadRecords}>Refresh Records</AppButton>
          </ActionBar>

          <div className="mt-4 grid gap-3">
            {records.map((row) => (
              <SettingsInset
                key={row.id}
                eyebrow={`${row.accountId} · ${row.chain}`}
                title={`${row.asset} · ${row.rpcHealthy ? "rpc healthy" : "rpc pending"}`}
                description={row.message}
                actions={<StatusBadge label={row.status} tone={row.status === "SUCCESS" ? "success" : row.status === "PENDING" ? "warning" : "danger"} />}
              >
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300">Balance before: <span className="font-semibold text-slate-900 dark:text-white">{row.balanceBefore}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Balance after: <span className="font-semibold text-slate-900 dark:text-white">{row.balanceAfter}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Transfers: <span className="font-semibold text-slate-900 dark:text-white">{row.detectedTransferCount}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Query / trade: <span className="font-semibold text-slate-900 dark:text-white">{row.canQuery ? "yes" : "no"} / {row.canTrade ? "yes" : "no"}</span></p>
                </div>
              </SettingsInset>
            ))}
            {records.length === 0 ? <div className="empty-state">No wallet probes recorded yet.</div> : null}
          </div>
        </PanelSection>
      </WorkspaceCluster>
    </AdminShell>
  );
}
