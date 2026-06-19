"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminWorkspace } from "@/components/admin/useAdminWorkspace";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionBar, AppButton, AppInput, AppLinkButton, AppSelect, DataTable, FormField, FormGrid, PanelSection, SettingsInset, TableCell, TableRow, WorkspaceCluster } from "@/components/dashboard-sections";
import { RegisteredUser, BillingProfile } from "@/lib/types";

type UserRow = RegisteredUser & { billingProfile?: BillingProfile | null };

function toneForUserStatus(s: string) {
  if (s === "active" || s === "verified") return "success" as const;
  if (s === "quota_exhausted" || s === "suspended") return "danger" as const;
  return "warning" as const;
}

export function AdminUsersWorkspace(props: { admin: { email: string; role: string } }) {
  const { admin } = props;
  const { status, setWorkspace } = useAdminWorkspace();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No users loaded yet.");
  const selectedUser = useMemo(() => users.find((u) => u.userId === selectedUserId) ?? users[0] ?? null, [selectedUserId, users]);

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.status === 401) { window.location.href = "/admin/login"; return; }
    if (!res.ok) return;
    const payload = await res.json().catch(() => ({ users: [] }));
    setUsers(Array.isArray(payload.users) ? payload.users : []);
    if (!selectedUserId && Array.isArray(payload.users) && payload.users[0]?.userId) setSelectedUserId(payload.users[0].userId);
  };

  useEffect(() => { void loadUsers(); }, []);

  const refreshWorkspace = async () => {
    const res = await fetch("/api/admin/workspace", { cache: "no-store" });
    if (res.ok) { const payload = await res.json(); setWorkspace(payload); }
  };

  const saveUser = async () => {
    if (!selectedUser) { setMessage("Select a user first."); return; }
    setBusy(true); setMessage("Saving...");
    try {
      const res = await fetch("/api/admin/users/" + selectedUser.userId, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: selectedUser.fullName, email: selectedUser.email, country: selectedUser.country, address: selectedUser.address, investorTier: selectedUser.investorTier, status: selectedUser.status, referralCode: selectedUser.referralCode, performanceFeeRate: selectedUser.billingProfile?.performanceFeeRate }) });
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      const payload = await res.json().catch(() => ({ message: "Save failed." }));
      if (!res.ok) { setMessage(payload.message || "Save failed."); return; }
      setMessage("Saved."); await loadUsers(); await refreshWorkspace();
    } finally { setBusy(false); }
  };

  const summary = useMemo(() => ({ total: users.length, active: users.filter((u) => u.status === "active").length, verified: users.filter((u) => u.emailVerifiedAt).length, managed: users.filter((u) => u.billingProfile?.billingMode === "PERFORMANCE").length }), [users]);

  return (
    <AdminShell admin={admin} title="Users Workspace" description="Operate subscriber identity, readiness, billing posture, and lifecycle state from a single investor administration lane." status={status}
      badges={[{ label: summary.total + " users", tone: "info" }, { label: summary.active + " active", tone: "success" }, { label: summary.verified + " verified", tone: "info" }]}
      statusNote="Member identity, lifecycle status, and billing posture are managed here before accounts, funding, and execution lanes are activated."
      actions={<AppLinkButton href="/admin" variant="outline" size="sm">Back to Overview</AppLinkButton>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Registered Users" value={summary.total} />
        <StatTile label="Active Members" value={summary.active} tone="emerald" />
        <StatTile label="Verified Email" value={summary.verified} tone="amber" />
        <StatTile label="Managed Accounts" value={summary.managed} tone="rose" />
      </div>

      <WorkspaceCluster eyebrow="Subscriber operations" title="Identity, commercial profile, and readiness" description="Keep subscriber identity, billing-profile editing, and registry audit inside one operator surface." mt={7}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <PanelSection title="Member editor" description="Select a registered member and update their identity fields, billing preferences, and lifecycle status." eyebrow="Editor lane">
            <FormGrid columns={{ base: 1, md: 2 }} gap={3}>
              <FormField label="Member">
                <AppSelect value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  {users.map((u) => <option key={u.userId} value={u.userId}>{u.fullName} ({u.userId})</option>)}
                </AppSelect>
              </FormField>
            </FormGrid>
            {selectedUser ? <>
              <SettingsInset mt={4} eyebrow={selectedUser.fullName} title={selectedUser.userId + " · " + selectedUser.email} description={selectedUser.status} actions={<StatusBadge label={selectedUser.status} tone={toneForUserStatus(selectedUser.status)} />}>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-sky-100 bg-white/90 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tier</p><p className="mt-2 text-sm font-semibold text-slate-900">{selectedUser.investorTier}</p></div>
                  <div className="rounded-2xl border border-sky-100 bg-white/90 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Billing mode</p><p className="mt-2 text-sm font-semibold text-slate-900">{selectedUser.billingProfile?.billingMode ?? "Unknown"}</p></div>
                  <div className="rounded-2xl border border-sky-100 bg-white/90 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Verification</p><p className="mt-2 text-sm font-semibold text-slate-900">{selectedUser.emailVerifiedAt ? "Verified" : "Pending"}</p></div>
                </div>
              </SettingsInset>
              <FormGrid mt={4} columns={{ base: 1, lg: 2 }} gap={3}>
                <FormField label="Full name"><AppInput value={selectedUser.fullName} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, fullName: e.target.value } : u))} /></FormField>
                <FormField label="Email"><AppInput value={selectedUser.email} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, email: e.target.value } : u))} /></FormField>
                <FormField label="Country"><AppInput value={selectedUser.country} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, country: e.target.value } : u))} /></FormField>
                <FormField label="Investor tier"><AppSelect value={selectedUser.investorTier} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, investorTier: e.target.value as RegisteredUser["investorTier"] } : u))}>
                  <option value="BRONZE">Bronze</option><option value="SILVER">Silver</option><option value="GOLD">Gold</option><option value="PLATINUM">Platinum</option>
                </AppSelect></FormField>
                <FormField label="Member status"><AppSelect value={selectedUser.status} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, status: e.target.value as RegisteredUser["status"] } : u))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                </AppSelect></FormField>
                <FormField label="Referral code"><AppInput value={selectedUser.referralCode ?? ""} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, referralCode: e.target.value || null } : u))} /></FormField>
                <FormField label="Address" gridColumn={{ lg: "span 2" }}><AppInput value={selectedUser.address} onChange={(e) => setUsers((c) => c.map((u) => u.userId === selectedUser.userId ? { ...u, address: e.target.value } : u))} /></FormField>
              </FormGrid>
              <ActionBar mt={4} status={<div className="text-right"><p className="font-semibold text-slate-900 dark:text-white">Billing posture</p><p className="mt-1 text-xs text-slate-500">Performance fee rate {selectedUser.billingProfile?.performanceFeeRate ?? 0}</p></div>}>
                <AppButton className="text-sm" disabled={busy} onClick={saveUser}>{busy ? "Saving..." : "Save Member"}</AppButton>
                <span className="text-xs text-slate-500">{message}</span>
              </ActionBar>
            </> : <div className="empty-state mt-4">No user selected.</div>}
          </PanelSection>

          <PanelSection title="Registry and operating posture" description="Compact roster view for audit and triage." eyebrow="Audit lane">
            <SettingsInset eyebrow="Operational summary" title="Member lifecycle snapshot" description="Short roster slice for support, readiness review, and billing follow-up.">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-sky-100 bg-white/90 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Verified members</p><p className="mt-2 text-sm font-semibold text-slate-900">{summary.verified} of {summary.total}</p></div>
                <div className="rounded-2xl border border-sky-100 bg-white/90 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Managed billing</p><p className="mt-2 text-sm font-semibold text-slate-900">{summary.managed} members in performance mode</p></div>
              </div>
            </SettingsInset>
            <div className="mt-4">
              <DataTable minWidth="980px" headers={["Member", "Tier", "Status", "Billing", "Verified", "Last Active"]} isEmpty={users.length === 0} emptyMessage="No registered users returned.">
                {users.slice(0, 12).map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell><p className="font-semibold text-slate-900 dark:text-white">{user.fullName}</p><p className="mt-1 text-xs text-slate-500">{user.userId} · {user.email}</p></TableCell>
                    <TableCell><StatusBadge label={user.investorTier} tone="info" /></TableCell>
                    <TableCell><StatusBadge label={user.status} tone={toneForUserStatus(user.status)} /></TableCell>
                    <TableCell>{user.billingProfile?.billingMode ?? "Unknown"}</TableCell>
                    <TableCell>{user.emailVerifiedAt ? "Yes" : "No"}</TableCell>
                    <TableCell suppressHydrationWarning>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "Unknown"}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </div>
          </PanelSection>
        </div>
      </WorkspaceCluster>
    </AdminShell>
  );
}
