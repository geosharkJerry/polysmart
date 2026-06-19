"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppInput, AppLinkButton, DataTable, FormField, FormGrid, PanelSection, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";
import { PscReconciliationReport, SettlementLedger } from "@/lib/types";

function toneForPaymentReconciliationStatus(status: string) {
  if (status === "SUCCESS") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "MISMATCH" || status === "ERROR") return "danger" as const;
  return "info" as const;
}

function toneForInvoiceStatus(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "open") return "warning" as const;
  return "neutral" as const;
}

export function AdminSettlementsWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status, setWorkspace } = useAdminWorkspace();
  const [stripeReconcileDraft, setStripeReconcileDraft] = useState({ sessionId: "", stripeSessionId: "" });
  const [stripeReconcileBusy, setStripeReconcileBusy] = useState(false);
  const [stripeStatus, setStripeStatus] = useState("No Stripe reconciliation has been run yet.");
  const [pscBusy, setPscBusy] = useState(false);
  const [pscStatus, setPscStatus] = useState("No PSC reconciliation has been run yet.");
  const [pscReport, setPscReport] = useState<PscReconciliationReport | null>(null);
  const [settlements, setSettlements] = useState<SettlementLedger[]>(workspace.settlements);

  const summary = useMemo(
    () => ({
      paymentSessions: workspace.paymentSessions.length,
      reconciliationLogs: workspace.paymentReconciliationLogs.length,
      settlements: settlements.length,
      revenueEvents: workspace.revenueEvents.length,
      pendingCommissionUsd: workspace.summary.pendingCommissionUsd,
      totalPaidRechargeUsd: workspace.summary.totalPaidRechargeUsd,
      platformRevenueUsd: workspace.summary.platformRevenueUsd
    }),
    [
      settlements.length,
      workspace.paymentReconciliationLogs.length,
      workspace.paymentSessions.length,
      workspace.revenueEvents.length,
      workspace.summary.pendingCommissionUsd,
      workspace.summary.platformRevenueUsd,
      workspace.summary.totalPaidRechargeUsd
    ]
  );

  const refreshWorkspaceSlices = async () => {
    const res = await fetch("/api/admin/workspace", { cache: "no-store" });
    if (!res.ok) return;
    const payload = await res.json();
    setWorkspace(payload);
    setSettlements(payload.settlements ?? []);
  };

  const runStripeReconcile = async () => {
    const sessionId = stripeReconcileDraft.sessionId.trim();
    const stripeSessionId = stripeReconcileDraft.stripeSessionId.trim();
    if (!sessionId && !stripeSessionId) {
      setStripeStatus("Enter a payment session ID or Stripe checkout session ID first.");
      return;
    }

    setStripeReconcileBusy(true);
    setStripeStatus("Running Stripe reconciliation...");
    try {
      const res = await fetch("/api/admin/stripe-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId || undefined, stripeSessionId: stripeSessionId || undefined })
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ message: "Stripe reconciliation failed." }));
      if (!res.ok) {
        setStripeStatus(payload.message || "Stripe reconciliation failed.");
        return;
      }
      setStripeStatus(`Stripe reconciliation complete · ${payload.log?.status ?? "success"}`);
      await refreshWorkspaceSlices();
    } finally {
      setStripeReconcileBusy(false);
    }
  };

  const runPscReconciliation = async () => {
    setPscBusy(true);
    setPscStatus("Running PSC reconciliation...");
    try {
      const res = await fetch("/api/admin/psc/reconciliation", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await res.json().catch(() => ({ message: "PSC reconciliation failed." }));
      if (!res.ok) {
        setPscStatus(payload.message || "PSC reconciliation failed.");
        return;
      }
      setPscReport(payload.report ?? null);
      setPscStatus(`PSC reconciliation complete · net profit $${Number(payload.report?.netProfitUsd ?? 0).toLocaleString()}`);
      await refreshWorkspaceSlices();
    } finally {
      setPscBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="Settlements Workspace"
      description="Operate recharge closeout, managed commission settlement, and ledger evidence from one unified settlement workspace."
      status={status}
      badges={[
        { label: `${summary.paymentSessions} payment sessions`, tone: "info" },
        { label: `${summary.reconciliationLogs} reconciliation logs`, tone: "info" },
        { label: `${summary.settlements} settlements`, tone: "info" }
      ]}
      statusNote="This workspace now groups Stripe closeout, PSC settlement, and ledger evidence into one dedicated operator flow."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Stripe Sessions" value={summary.paymentSessions} />
        <StatTile label="Reconciliation Logs" value={summary.reconciliationLogs} tone="emerald" />
        <StatTile label="Settlements" value={summary.settlements} tone="amber" />
        <StatTile label="Revenue Events" value={summary.revenueEvents} tone="rose" />
      </div>

      <WorkspaceCluster
        eyebrow="Settlement operations"
        title="Recharge closeout, PSC revenue, and ledger evidence"
        description="Stripe confirmation, settlement recomputation, and ledger review now live inside one settlement-focused operating surface."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-6">
            <PanelSection
              title="Stripe recharge reconciliation"
              description="Confirm a Stripe checkout session against the internal payment ledger before points are considered final."
              eyebrow="Recharge lane"
            >
              <SettingsInset eyebrow="Reconciliation state" title="Stripe confirmation workflow" description={stripeStatus}>
                <FormGrid mt={1} columns={{ base: 1, lg: 2 }} gap={3}>
                  <FormField label="Polysmart payment session ID" helperText="Example: PAY-... from the recharge ledger.">
                    <AppInput value={stripeReconcileDraft.sessionId} onChange={(event) => setStripeReconcileDraft((current) => ({ ...current, sessionId: event.target.value }))} placeholder="PAY-..." />
                  </FormField>
                  <FormField label="Stripe checkout session ID" helperText="Example: cs_live_... from Stripe Dashboard or redirect callbacks.">
                    <AppInput value={stripeReconcileDraft.stripeSessionId} onChange={(event) => setStripeReconcileDraft((current) => ({ ...current, stripeSessionId: event.target.value }))} placeholder="cs_live_..." />
                  </FormField>
                </FormGrid>
                <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">This action still validates amount, currency, and paid state before any points credit is recognized.</span>}>
                  <AppButton className="text-sm" disabled={stripeReconcileBusy} onClick={runStripeReconcile}>
                    {stripeReconcileBusy ? "Reconciling..." : "Reconcile Stripe Session"}
                  </AppButton>
                </ActionBar>
              </SettingsInset>
            </PanelSection>

            <PanelSection
              title="PSC revenue closeout"
              description="Recompute performance revenue and review the resulting net profit snapshot from current settlement evidence."
              eyebrow="Revenue lane"
            >
              <ActionBar mt={0} status={<span className="text-sm text-slate-600 dark:text-slate-300">{pscStatus}</span>}>
                <AppButton className="text-sm" disabled={pscBusy} onClick={runPscReconciliation}>
                  {pscBusy ? "Running..." : "Run PSC Reconciliation"}
                </AppButton>
              </ActionBar>

              {pscReport ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SettingsInset eyebrow="Revenue" title={`$${pscReport.totalRevenueUsd.toLocaleString()}`} description={`Performance $${pscReport.totalPerformanceFeesUsd.toLocaleString()} · Subscription $${pscReport.totalSubscriptionFeesUsd.toLocaleString()}`}>
                    <div />
                  </SettingsInset>
                  <SettingsInset eyebrow="Net profit" title={`$${pscReport.netProfitUsd.toLocaleString()}`} description={`Pending commission $${pscReport.totalPendingCommissionUsd.toLocaleString()}`}>
                    <div />
                  </SettingsInset>
                </div>
              ) : (
                <div className="empty-state mt-4">No PSC report has been run yet.</div>
              )}
            </PanelSection>
          </div>

          <div className="grid gap-6">
            <PanelSection
              title="Ledger posture"
              description="Keep recharge totals, platform revenue, and the latest closeout traces visible in one review lane."
              eyebrow="Overview lane"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <SettingsInset eyebrow="Recharge value" title={`$${summary.totalPaidRechargeUsd.toLocaleString()}`}>
                  <div />
                </SettingsInset>
                <SettingsInset eyebrow="Platform revenue" title={`$${summary.platformRevenueUsd.toLocaleString()}`}>
                  <div />
                </SettingsInset>
              </div>

              <div className="mt-4 grid gap-3">
                {workspace.paymentReconciliationLogs.slice(0, 5).map((log) => (
                  <SettingsInset
                    key={log.id}
                    eyebrow="Reconciliation log"
                    title={log.id}
                    description={log.message}
                    actions={<StatusBadge label={log.status} tone={toneForPaymentReconciliationStatus(log.status)} />}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400" suppressHydrationWarning>{new Date(log.createdAt).toLocaleString()}</p>
                  </SettingsInset>
                ))}
                {workspace.paymentReconciliationLogs.length === 0 ? <div className="empty-state">No payment reconciliation logs are available yet.</div> : null}
              </div>
            </PanelSection>

            <PanelSection
              title="Settlement ledger"
              description="Inspect the settlement rows that power PSC reporting and managed commission tracking."
              eyebrow="Ledger lane"
            >
              <DataTable minWidth="780px" headers={["Record", "Mode", "Revenue", "Date"]} isEmpty={settlements.length === 0} emptyMessage="No settlement ledger entries are available yet.">
                {settlements.slice(0, 10).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">{row.id}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.userId} · {row.eventId}</p>
                    </TableCell>
                    <TableCell><StatusBadge label={row.mode} tone={row.mode === "PERFORMANCE" ? "danger" : "info"} /></TableCell>
                    <TableCell>${row.platformRevenueUsd.toLocaleString()}</TableCell>
                    <TableCell suppressHydrationWarning>{new Date(row.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </PanelSection>

            <PanelSection
              title="Payment session ledger"
              description="Review recharge sessions, their package source, and credited points posture."
              eyebrow="Session lane"
            >
              <DataTable minWidth="980px" headers={["Session", "User", "Package", "Amount", "Status", "Created"]} isEmpty={workspace.paymentSessions.length === 0} emptyMessage="No payment sessions are available yet.">
                {workspace.paymentSessions.slice(0, 10).map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <p className="font-semibold text-slate-900 dark:text-white">{session.id}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.stripeSessionId ?? "no Stripe session"}</p>
                    </TableCell>
                    <TableCell>{session.userId}</TableCell>
                    <TableCell>{session.packageId}</TableCell>
                    <TableCell>${session.amountUsd.toLocaleString()} · {session.pointsGranted.toLocaleString()} pts</TableCell>
                    <TableCell><StatusBadge label={session.status} tone={toneForInvoiceStatus(session.status)} /></TableCell>
                    <TableCell suppressHydrationWarning>{new Date(session.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </PanelSection>
          </div>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
