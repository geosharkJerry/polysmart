"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { ActionBar, AppButton, AppLinkButton, PanelSection, SettingsInset, WorkspaceCluster } from "@/components/dashboard-sections";

export function AdminFeedbackWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No feedback merge has been run yet.");

  const summary = useMemo(() => ({
    total: ((workspace as any).stressResults??[]).length,
    merged: ((workspace as any).stressResults??[]).filter((s: any) => (s as any).status === "MERGED").length
  }), [((workspace as any).stressResults??[])]);

  const runMerge = async () => {
    setBusy(true); setMessage("Merging feedback...");
    try {
      const res = await fetch("/api/admin/feedback/merge", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const payload = await res.json().catch(() => ({ message: "Merge failed." }));
      if (!res.ok) { setMessage(payload.message || "Merge failed."); return; }
      setMessage("Merged " + (payload.merged ?? 0) + " feedback signals.");
    } finally { setBusy(false); }
  };

  return (
    <AdminShell admin={admin} title="Feedback Workspace" description="Merge feedback signals from the priority bus into the production-readiness posture." status={status}
      badges={[{ label: summary.total + " signals", tone: "info" }, { label: summary.merged + " merged", tone: "success" }]}
      statusNote="This workspace merges feedback events from the priority bus into production readiness."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}>
      <div className="grid gap-4 md:grid-cols-2">
        <StatTile label="Feedback Signals" value={summary.total} />
        <StatTile label="Merged" value={summary.merged} tone="emerald" />
      </div>
      <WorkspaceCluster eyebrow="Feedback operations" title="Signal merge and evidence review" description="Merge priority-bus feedback into the production-readiness posture." mt={7}>
        <PanelSection title="Signal merge" description="Trigger the merge action and review the current feedback landscape." eyebrow="Merge lane">
          <ActionBar mt={0} status={<span className="text-xs text-slate-500">{message}</span>}>
            <AppButton className="text-sm" disabled={busy} onClick={runMerge}>{busy ? "Merging..." : "Merge Feedback"}</AppButton>
          </ActionBar>
          <div className="mt-4 grid gap-3">
            {((workspace as any).stressResults??[]).slice(0, 8).map((signal: any) => (
              <div key={signal.id} className="rounded-2xl border border-sky-100 bg-white/90 p-4 text-xs"><p className="font-semibold text-slate-900">{signal.message}</p><p className="mt-1 text-slate-500">{signal.category} · {signal.status}</p><StatusBadge label={signal.status} tone={(signal as any).status === "MERGED" ? "success" : "warning"} /></div>
            ))}
            {((workspace as any).stressResults??[]).length === 0 ? <div className="empty-state">No feedback signals are available yet.</div> : null}
          </div>
        </PanelSection>
      </WorkspaceCluster>
    </AdminShell>
  );
}
