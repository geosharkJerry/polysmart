# Full-Stack Function Audit

Date: 2026-06-18

## Scope

This audit covers the current Polysmart member, console, and admin surfaces in the working tree, and compares them against the implemented `app/api` routes.

## Implemented User-Facing Surfaces

### Member flows

- `/register`
- `/verify-email`
- `/login`
- `/workspace`
- `/console`

### Admin flows

- `/admin`
- `/admin/login`
- `/admin/accounts`
- `/admin/audit`
- `/admin/auth`
- `/admin/connectors`
- `/admin/cron-validation`
- `/admin/evidence`
- `/admin/execution`
- `/admin/feedback`
- `/admin/integrations`
- `/admin/onchain-sync`
- `/admin/operations`
- `/admin/payments`
- `/admin/pool`
- `/admin/risk`
- `/admin/settings`
- `/admin/settlements`
- `/admin/strategy`
- `/admin/stress`
- `/admin/users`
- `/admin/venue-probes`
- `/admin/wallet-funding-probes`
- `/admin/ai-route`

## High-Value Coverage Result

The current tree now exposes operator-facing pages for the major business capabilities:

- member onboarding and verification
- subscription and billing management
- account binding and funding unlock
- execution control and intent lifecycle
- pool, risk, and settlement operations
- admin audit, evidence, readiness, and cron validation
- connector, venue, wallet, and onchain sync probes
- AI routing and feedback loop controls

Based on the current route/page inventory, no additional high-value operator page is clearly missing.

## Backend-Only Support Routes

The following routes appear to be support surfaces or integration endpoints that do not need their own standalone UI because they are already consumed by an existing workspace or are intended for system-level calls:

- `/api/payments/stripe/webhook`
- `/api/execution/orders`
- `/api/risk/healing`
- `/api/admin/auth/list`
- `/api/auth/captcha`
- `/api/admin/payments/stripe/reconcile`
- `/api/admin/settlements`
- `/api/admin/integrations/evidence`
- `/api/admin/integrations/readiness`
- `/api/admin/integrations/venue-probes`
- `/api/admin/integrations/wallet-funding-probes`

### Route-by-route notes

- `/api/payments/stripe/webhook`: inbound Stripe event receiver; should remain backend-only.
- `/api/execution/orders`: read snapshot API for execution order state; already consumed by the execution workspace.
- `/api/risk/healing`: diagnostic risk bundle and audit-log snapshot; appropriate as a service endpoint, not a separate user page.
- `/api/auth/captcha`: login support endpoint; intentionally hidden behind the member auth flow.
- `/api/admin/auth/list`: internal admin directory endpoint; surfaces in auth management, not as a product page.
- `/api/admin/payments/stripe/reconcile`: reconciliation helper already surfaced from the payments workspace.
- `/api/admin/settlements`: settlement snapshot helper already covered by the settlements workspace.
- `/api/admin/integrations/evidence`: evidence snapshot generator already surfaced through the evidence workspace.
- `/api/admin/integrations/readiness`: readiness snapshot generator already surfaced through the evidence and integrations workspaces.
- `/api/admin/integrations/venue-probes`: probe runner already surfaced through the integrations and venue-probe workspaces.
- `/api/admin/integrations/wallet-funding-probes`: probe runner already surfaced through the integrations and wallet-probe workspaces.
- `/api/admin/auth/list`: internal admin directory helper surfaced through the auth workspace; keep backend-only.
- `/api/payments/stripe/webhook`: inbound Stripe event receiver; keep backend-only.
- `/api/execution/orders`: execution snapshot API consumed by the member console and execution workspaces; keep backend-only.
- `/api/risk/healing`: risk diagnostics helper consumed by the risk surface; keep backend-only.

## Notes

- `app/admin/settlements/page.tsx` already provides a dedicated settlements workspace for PSC and Stripe reconciliation.
- `app/admin/evidence/page.tsx`, `app/admin/cron-validation/page.tsx`, and `app/admin/integrations/page.tsx` already cover the production validation and evidence workflow.
- `app/admin/operations/page.tsx` already exposes the bus, pool, risk, and context operations hub.
- `app/admin/auth/page.tsx` already exposes the internal admin identity and session directory, so `/api/admin/auth/list` stays backend-only.
- The current audit did not identify a missing operator workflow that justifies a new page.
- The member console and admin workspaces already consume `/api/accounts/[accountId]`, `/api/billing/profile/[userId]`, `/api/subscriptions/[userId]`, `/api/commissions/[commissionId]`, and related detail endpoints, so those are not missing pages.

## Verification Performed

- Enumerated all `app/**/page.tsx` files.
- Enumerated all `app/api/**/route.ts` files.
- Cross-checked route usage across `app`, `components`, and `lib`.
- Reviewed the dedicated admin workspace pages and their route bindings.
- Confirmed that the currently unreferenced routes are either system hooks or already surfaced through existing admin/member workspaces.
- Confirmed that the detail/update endpoints used by the member console and admin workspaces are already surfaced in the UI.

## Residual Gap

If new backend routes are added later, they should be checked against this matrix to decide whether they belong in:

- a dedicated operator page
- an existing page section
- or a backend-only support endpoint
