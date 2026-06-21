# Route Coverage Matrix

Date: 2026-06-18

| Route | Status | Representative refs |
|---|---|---|
| `/accounts` | surfaced or support | app/console/page.tsx, components/AdminDashboard.tsx, components/admin/AdminAccountsWorkspace.tsx |
| `/accounts/[accountId]` | surfaced or support | - |
| `/accounts/[accountId]/funding` | surfaced or support | - |
| `/admin/audit/export` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminAuditWorkspace.tsx |
| `/admin/audit/logs` | surfaced or support | components/admin/AdminAuditWorkspace.tsx |
| `/admin/auth/list` | backend-only | - |
| `/admin/auth/login` | surfaced or support | app/admin/login/page.tsx |
| `/admin/auth/logout` | surfaced or support | components/AdminDashboard.tsx |
| `/admin/auth/me` | surfaced or support | app/admin/login/page.tsx |
| `/admin/auth/sessions` | surfaced or support | components/admin/AdminAuthWorkspace.tsx |
| `/admin/evidence` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminEvidenceWorkspace.tsx, components/admin/AdminSectionNav.tsx |
| `/admin/feedback/merge` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminFeedbackWorkspace.tsx |
| `/admin/integrations/evidence` | surfaced or support | - |
| `/admin/integrations/polymarket/track` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminIntegrationsWorkspace.tsx |
| `/admin/integrations/production-validation` | surfaced or support | components/admin/AdminCronValidationWorkspace.tsx |
| `/admin/integrations/production-validation/cron` | surfaced or support | components/admin/AdminCronValidationWorkspace.tsx |
| `/admin/integrations/readiness` | surfaced or support | - |
| `/admin/integrations/venue-probes` | surfaced or support | - |
| `/admin/integrations/wallet-funding-probes` | surfaced or support | - |
| `/admin/operations` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminSectionNav.tsx, components/admin/AdminOperationsWorkspace.tsx |
| `/admin/payments/stripe/reconcile` | surfaced or support | - |
| `/admin/production-validation` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminIntegrationsWorkspace.tsx, components/admin/AdminEvidenceWorkspace.tsx |
| `/admin/production-validation-cron` | surfaced or support | lib/services/production-readiness.ts |
| `/admin/psc/reconciliation` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminSettingsWorkspace.tsx, components/admin/AdminSettlementsWorkspace.tsx |
| `/admin/readiness` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminEvidenceWorkspace.tsx |
| `/admin/settings` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminSettingsWorkspace.tsx, components/admin/AdminSectionNav.tsx |
| `/admin/settlements` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminSectionNav.tsx |
| `/admin/stress/run` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminStressWorkspace.tsx |
| `/admin/stripe-reconcile` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminSettlementsWorkspace.tsx, components/admin/AdminPaymentsWorkspace.tsx |
| `/admin/users` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminUsersWorkspace.tsx, components/admin/AdminSectionNav.tsx |
| `/admin/users/[userId]` | surfaced or support | - |
| `/admin/venue-probes` | surfaced or support | components/admin/AdminVenueProbesWorkspace.tsx, components/admin/AdminIntegrationsWorkspace.tsx, components/admin/AdminSectionNav.tsx |
| `/admin/wallet-funding-probes` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminWalletFundingProbesWorkspace.tsx, components/admin/AdminIntegrationsWorkspace.tsx |
| `/admin/workspace` | surfaced or support | components/AdminDashboard.tsx, components/admin/AdminPoolWorkspace.tsx, components/admin/AdminUsersWorkspace.tsx |
| `/ai/route` | surfaced or support | components/admin/AdminAiRouteWorkspace.tsx |
| `/auth/captcha` | surfaced or support | components/LoginCaptcha.tsx |
| `/auth/login` | surfaced or support | app/admin/login/page.tsx, app/login/page.tsx |
| `/auth/logout` | surfaced or support | app/workspace/page.tsx, components/AdminDashboard.tsx |
| `/auth/me` | surfaced or support | app/workspace/page.tsx, app/admin/login/page.tsx, app/console/page.tsx |
| `/auth/register` | surfaced or support | app/register/page.tsx |
| `/auth/verify` | surfaced or support | app/verify-email/page.tsx |
| `/billing/profile/[userId]` | surfaced or support | - |
| `/bus/enqueue` | surfaced or support | components/admin/AdminOperationsWorkspace.tsx |
| `/bus/process` | surfaced or support | components/admin/AdminOperationsWorkspace.tsx |
| `/cache/warm` | surfaced or support | components/admin/AdminConnectorsWorkspace.tsx, components/admin/AdminIntegrationsWorkspace.tsx |
| `/commissions/[commissionId]` | surfaced or support | - |
| `/config` | surfaced or support | app/console/page.tsx |
| `/connectors/health` | surfaced or support | components/admin/AdminConnectorsWorkspace.tsx, components/admin/AdminIntegrationsWorkspace.tsx |
| `/connectors/stream` | surfaced or support | components/admin/AdminConnectorsWorkspace.tsx, components/admin/AdminIntegrationsWorkspace.tsx |
| `/console/workspace/[userId]` | surfaced or support | - |
| `/events` | surfaced or support | lib/services/polymarket-tracking.ts |
| `/execution/context` | surfaced or support | app/console/page.tsx, components/admin/AdminStrategyWorkspace.tsx |
| `/execution/intents` | surfaced or support | app/console/page.tsx, components/admin/AdminStrategyWorkspace.tsx |
| `/execution/orders` | backend-only | - |
| `/execution/sign` | surfaced or support | app/console/page.tsx, components/admin/AdminStrategyWorkspace.tsx |
| `/execution/simulate` | surfaced or support | app/console/page.tsx, components/admin/AdminStrategyWorkspace.tsx |
| `/execution/submit` | surfaced or support | app/console/page.tsx, components/admin/AdminStrategyWorkspace.tsx |
| `/onchain/sync` | surfaced or support | components/admin/AdminOnchainSyncWorkspace.tsx |
| `/payments/stripe/checkout` | surfaced or support | app/console/page.tsx |
| `/payments/stripe/confirm` | surfaced or support | app/console/page.tsx |
| `/payments/stripe/webhook` | backend-only | - |
| `/pool/deposit` | surfaced or support | components/admin/AdminPoolWorkspace.tsx |
| `/pool/nav` | surfaced or support | components/admin/AdminPoolWorkspace.tsx |
| `/pool/settle` | surfaced or support | components/admin/AdminPoolWorkspace.tsx |
| `/risk/circuit` | surfaced or support | components/admin/AdminRiskWorkspace.tsx |
| `/risk/healing` | backend-only | - |
| `/risk/settlement-trap` | surfaced or support | components/SettlementTrapWidget.tsx, components/admin/AdminRiskWorkspace.tsx |
| `/risk/status` | surfaced or support | components/admin/AdminRiskWorkspace.tsx |
| `/strategy/quote` | surfaced or support | app/console/page.tsx, components/admin/AdminStrategyWorkspace.tsx |
| `/strategy/score` | surfaced or support | components/admin/AdminStrategyWorkspace.tsx |
| `/subscriptions/[userId]` | surfaced or support | - |
| `/trades/charge` | surfaced or support | app/console/page.tsx |