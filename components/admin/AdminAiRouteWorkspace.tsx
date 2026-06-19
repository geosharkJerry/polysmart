"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionBar, FormField, FormGrid, PanelSection, SettingsInset, WorkspaceCluster , AppButton, AppInput, AppLinkButton, AppSelect, TableCell, TableRow } from "@/components/dashboard-sections";

type AiRouteResult = {
  provider: "relay-fast" | "relay-deep" | "relay-macro";
  analysis: {
    status: string;
    summary: string;
    winProbability: number;
    confidence: number;
    rawModel: string;
    completedAt: string;
  };
  reason: string;
};

function toneForRelayMode(mode: string) {
  if (mode === "live") return "success" as const;
  if (mode === "mock") return "warning" as const;
  return "info" as const;
}

function toneForAnalysisStatus(status: string) {
  if (status === "AI_ANALYZED") return "success" as const;
  if (status === "PLACEHOLDER_CONFIG") return "warning" as const;
  if (status === "AI_UNAVAILABLE") return "danger" as const;
  return "info" as const;
}

export function AdminAiRouteWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { workspace, status } = useAdminWorkspace();
  const [topic, setTopic] = useState("production validation");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [text, setText] = useState("Summarize the current operational evidence and route it to the best relay provider.");
  const [result, setResult] = useState<AiRouteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No AI route has been tested yet.");

  useEffect(() => {
    setMessage(`Current AI relay mode: ${workspace.systemSettings.api.aiGatewayMode}`);
  }, [workspace.systemSettings.api.aiGatewayMode]);

  const summary = useMemo(
    () => ({
      relayMode: workspace.systemSettings.api.aiGatewayMode,
      keyStatus: workspace.systemSettings.api.secretStatuses.aiGatewayApiKey.status,
      model: workspace.systemSettings.api.aiGatewayModel
    }),
    [workspace.systemSettings.api.aiGatewayMode, workspace.systemSettings.api.aiGatewayModel, workspace.systemSettings.api.secretStatuses.aiGatewayApiKey.status]
  );

  const runRoute = async () => {
    if (!topic.trim() || !text.trim()) {
      setMessage("Topic and text are required.");
      return;
    }

    setBusy(true);
    setMessage("Routing AI analysis...");
    try {
      const res = await fetch("/api/ai/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), text: text.trim(), urgency })
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = (await res.json().catch(() => ({ message: "AI route failed." }))) as AiRouteResult & { message?: string };
      if (!res.ok) {
        setMessage(payload.message || "AI route failed.");
        return;
      }
      setResult(payload);
      setMessage(payload.reason || "AI route completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      admin={admin}
      title="AI Route Workspace"
      description="Exercise the AI relay routing logic, inspect provider selection, and verify live or placeholder relay state from one protected operator page."
      status={status}
      badges={[
        { label: `${summary.relayMode} relay`, tone: toneForRelayMode(summary.relayMode) },
        { label: `${summary.keyStatus} key`, tone: summary.keyStatus === "configured" ? "success" : summary.keyStatus === "placeholder" ? "warning" : "danger" },
        { label: summary.model, tone: "info" }
      ]}
      statusNote="This workspace makes the AI routing path observable without exposing secrets or raw relay credentials."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Relay mode" value={summary.relayMode} />
        <StatTile label="Key status" value={summary.keyStatus} tone="amber" />
        <StatTile label="Model" value={summary.model} tone="emerald" />
      </div>

      <WorkspaceCluster
        eyebrow="Oracle routing"
        title="Route tester and relay analysis evidence"
        description="Send a topic payload through the AI routing engine, inspect the selected provider, and review the returned analysis posture."
        mt={7}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <PanelSection
            title="Route tester"
            description="Send a topic and text payload through the AI routing engine."
            eyebrow="Input lane"
          >
            <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
              <FormField label="Topic">
                <AppInput value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="production validation" />
              </FormField>
              <FormField label="Urgency">
                <AppSelect value={urgency} onChange={(event) => setUrgency(event.target.value as "low" | "medium" | "high") }>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </AppSelect>
              </FormField>
            </FormGrid>
            <FormField label="Text" mt={3}>
              <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Enter the operational text to route." className="min-h-40 w-full resize-y rounded-2xl border border-sky-100 bg-white/95 p-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-white/15 dark:bg-slate-950/72 dark:text-white" />
            </FormField>

            <ActionBar mt={4} status={<span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}>
              <AppButton className="text-sm" disabled={busy} onClick={runRoute}>{busy ? "Routing..." : "Run AI Route"}</AppButton>
            </ActionBar>
          </PanelSection>

          <PanelSection
            title="Route result"
            description="Inspect the provider decision and the resulting relay analysis."
            eyebrow="Result lane"
          >
            {result ? (
              <div className="grid gap-3">
                <SettingsInset eyebrow={result.provider} title={result.reason} description={`Model ${result.analysis.rawModel} · completed ${new Date(result.analysis.completedAt).toLocaleString()}`} actions={<StatusBadge label={result.analysis.status} tone={toneForAnalysisStatus(result.analysis.status)} />}>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{result.analysis.summary}</p>
                </SettingsInset>
                <div className="grid gap-3 md:grid-cols-2">
                  <SettingsInset eyebrow="Win probability" title={String(result.analysis.winProbability)}><div /></SettingsInset>
                  <SettingsInset eyebrow="Confidence" title={String(result.analysis.confidence)}><div /></SettingsInset>
                </div>
              </div>
            ) : (
              <div className="empty-state">No AI route result yet.</div>
            )}
          </PanelSection>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
