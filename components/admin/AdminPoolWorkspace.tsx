"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppInput, AppLinkButton, DataTable, FormField, FormGrid, PanelSection, SettingsInset, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";

function toneForPoolStatus(s: string) {
  if (s === "NORMAL") return "success" as const;
  if (s === "QUOTA_EXHAUSTED" || s === "CIRCUIT_BREAKER") return "danger" as const;
  return "warning" as const;
}

export function AdminPoolWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status, setWorkspace } = useAdminWorkspace();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amountUsd, setAmountUsd] = useState(0);
  const [poolStatus, setPoolStatus] = useState("No pool actions run yet.");
  const [settlementUserId, setSettlementUserId] = useState("");
  const [settlementProfitUsd, setSettlementProfitUsd] = useState(0);
  const [settlementStatus, setSettlementStatus] = useState("No settlement actions run yet.");
  const [busy, setBusy] = useState<false | "deposit" | "withdraw" | "settle">(false);
  const readValue = (e: ChangeEvent<HTMLInputElement>) => e.target.value;

  const pool = workspace.pool;
  const summary = useMemo(() => ({ members: workspace.users.length, totalAssets: pool?.totalAssetsUsd ?? 0 }), [workspace.users.length, pool?.totalAssetsUsd]);

  const refreshWorkspace = async () => {
    const res = await fetch("/api/admin/workspace", { cache: "no-store" });
    if (res.ok) { setWorkspace(await res.json()); }
  };

  const runDeposit = async () => {
    setBusy("deposit"); setPoolStatus("Depositing...");
    try {
      const res = await fetch("/api/pool/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUserId || workspace.users[0]?.userId, amountUsd }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      if (!res.ok) { setPoolStatus((await res.json()).message || "Deposit failed."); return; }
      setPoolStatus("Deposit completed."); await refreshWorkspace();
    } finally { setBusy(false); }
  };

  const runWithdraw = async () => {
    setBusy("withdraw"); setPoolStatus("Withdrawing...");
    try {
      const res = await fetch("/api/pool/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUserId || workspace.users[0]?.userId, amountUsd: -amountUsd }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      if (!res.ok) { setPoolStatus((await res.json()).message || "Withdraw failed."); return; }
      setPoolStatus("Emergency withdraw completed."); await refreshWorkspace();
    } finally { setBusy(false); }
  };

  const runSettlement = async () => {
    setBusy("settle"); setSettlementStatus("Settling...");
    try {
      const res = await fetch("/api/pool/settle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: settlementUserId || workspace.users[0]?.userId, profitUsd: settlementProfitUsd }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      if (!res.ok) { setSettlementStatus((await res.json()).message || "Settlement failed."); return; }
      setSettlementStatus("Profit settlement completed."); await refreshWorkspace();
    } finally { setBusy(false); }
  };

  return (
    <AdminShell admin={admin} title="Pool Workspace" description="Deposit, emergency withdraw, and settle managed-asset pool profit from a single operator surface." status={status}
      badges={[{ label: (pool as any)?.status ?? "pending", tone: toneForPoolStatus((pool as any)?.status ?? "NORMAL") }, { label: "$" + (summary.totalAssets).toLocaleString(), tone: "info" }, { label: summary.members + " members", tone: "info" }]}
      statusNote="This workspace isolates pool operations from venue-connector diagnostics so asset-pool state can remain the single source of truth for managed-capital flows."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}>
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="NAV" value={pool?.nav?.toFixed(6) ?? "---"} />
        <StatTile label="Total Assets" value={"$" + ((pool?.totalAssetsUsd ?? 0)).toLocaleString()} tone="emerald" />
        <StatTile label="Liquid Buffer" value={"$" + ((pool?.liquidBufferUsd ?? 0)).toLocaleString()} tone="amber" />
      </div>
      <WorkspaceCluster eyebrow="Pool operations" title="Deposit, withdraw, and settlement actions" description="Perform pool deposit/withdraw and managed-capital profit settlement." mt={7}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <div className="grid gap-6">
            <PanelSection title="Deposit / Emergency Withdraw" description="Deposit or urgently withdraw capital from the managed-asset pool." eyebrow="Capital lane">
              <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
                <FormField label="User ID"><AppInput value={selectedUserId} onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedUserId(readValue(e))} placeholder={workspace.users[0]?.userId ?? "user id"} /></FormField>
                <FormField label="Amount USD"><AppInput type="number" min={0} value={amountUsd} onChange={(e: ChangeEvent<HTMLInputElement>) => setAmountUsd(Number(readValue(e)))} /></FormField>
              </FormGrid>
              <ActionBar mt={4} status={<span className="text-xs text-slate-500">{poolStatus}</span>}>
                <AppButton className="text-sm" disabled={busy === "deposit"} onClick={runDeposit}>Deposit</AppButton>
                <AppButton className="text-sm" variant="outline" disabled={busy === "withdraw"} onClick={runWithdraw}>Emergency Withdraw</AppButton>
              </ActionBar>
            </PanelSection>
            <PanelSection title="Profit Settlement" description="Settle managed-capital profit to a specific member." eyebrow="Settlement lane">
              <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
                <FormField label="User ID"><AppInput value={settlementUserId} onChange={(e: ChangeEvent<HTMLInputElement>) => setSettlementUserId(readValue(e))} placeholder={workspace.users[0]?.userId ?? "user id"} /></FormField>
                <FormField label="Profit USD"><AppInput type="number" value={settlementProfitUsd} onChange={(e: ChangeEvent<HTMLInputElement>) => setSettlementProfitUsd(Number(readValue(e)))} /></FormField>
              </FormGrid>
              <ActionBar mt={4} status={<span className="text-xs text-slate-500">{settlementStatus}</span>}>
                <AppButton className="text-sm" disabled={busy === "settle"} onClick={runSettlement}>Settle Profit</AppButton>
              </ActionBar>
            </PanelSection>
          </div>
          <div className="grid gap-6">
            <PanelSection title="Pool NAV" description="Current NAV, total assets, and liquid buffer computed from the backend pool snapshot." eyebrow="Overview lane">
              <DataTable minWidth="480px" headers={["Metric", "Value", "Updated"]} isEmpty={!pool}>
                {pool ? <>
                  <TableRow><td className="px-4 py-3 font-medium">NAV</td><td className="px-4 py-3">{(pool as any).nav.toFixed(6)}</td><td className="px-4 py-3 text-sm text-slate-700" suppressHydrationWarning>{new Date((pool as any).updatedAt).toLocaleString()}</td></TableRow>
                  <TableRow><td className="px-4 py-3 font-medium">Total assets</td><td className="px-4 py-3">{"$" + (pool as any).totalAssetsUsd.toLocaleString()}</td><td className="px-4 py-3 text-sm text-slate-700" suppressHydrationWarning>{new Date((pool as any).updatedAt).toLocaleString()}</td></TableRow>
                  <TableRow><td className="px-4 py-3 font-medium">Liquid buffer</td><td className="px-4 py-3">{"$" + (pool as any).liquidBufferUsd.toLocaleString()}</td><td className="px-4 py-3 text-sm text-slate-700" suppressHydrationWarning>{new Date((pool as any).updatedAt).toLocaleString()}</td></TableRow>
                </> : null}
              </DataTable>
            </PanelSection>
            <PanelSection title="Pool audit log" description="Recent pool allocation and settlement events." eyebrow="Audit lane">
              <div className="grid gap-2">
                {((workspace as any).auditLogs ?? []).filter((l: any) => (l as any).category === "POOL" || l.category === "BILLING").slice(0, 5).map((log: any) => (
                  <div key={log.id} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-xs">
                    <p className="font-semibold text-slate-900">{log.message}</p>
                    <p className="mt-1 text-slate-500">{log.category} {"\u00b7"} {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {((workspace as any).auditLogs ?? []).filter((l: any) => (l as any).category === "POOL" || l.category === "BILLING").length === 0 ? <div className="empty-state">No pool audit events yet.</div> : null}
              </div>
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
