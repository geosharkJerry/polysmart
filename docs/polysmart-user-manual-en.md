# Polysmart User Manual

Version: 1.0
Language: English
Scope: Member registration, verification, login, workspace usage, console operations, and admin overview

## 1. What Polysmart Does

Polysmart is a prediction-market operating platform designed to help members discover opportunities, manage subscriptions, bind venue accounts, fund wallets, review live risk and execution signals, and operate through a single control room.

The product is organized into two main surfaces:

- `Member Workspace` at `/workspace`
- `Member Console` at `/console`

There is also a protected backoffice:

- `Admin Login` at `/admin/login`
- `Admin Command Center` at `/admin`

## 2. Before You Start

You will need:

- A valid email address
- A password you can keep secure
- Basic profile information such as name, country or region, and address
- A supported payment method if you want to purchase recharge credits or subscription plans
- Venue account details if you plan to bind external execution accounts

Important notes:

- Registration is a staged flow. You must verify your email before billing and runtime access are fully unlocked.
- Login uses an additional human verification step.
- Some funding and execution features depend on account binding and funding thresholds.
- Admin access is restricted to the seeded super administrator.

## 3. Account Registration

Open `/register` or use the `Start Membership` button from the homepage.

### 3.1 Choose a Plan

On the registration page, the selected plan comes first. You can choose from:

- `Managed Performance`
- `Agent Pro`
- `Institutional`

If you arrive from a pricing card on the homepage, the plan may already be preselected.

### 3.2 Complete the Registration Form

Fill in the following fields:

- Full Name
- Email
- Password
- Country or Region
- Address
- Investor Tier
- Selected Package
- Billing Cycle

You can choose one of the following billing cycles:

- Monthly
- Quarterly
- Annual

### 3.3 Accept the Disclosure

Before registration can continue, you must accept the Polysmart Member Registration Disclosure and Privacy Notice.

This step confirms that you understand your data may be used for:

- Member onboarding
- Email verification
- Billing
- Account servicing
- Related platform operations

### 3.4 Submit Registration

Click `Register Member`.

If the mail provider is configured, Polysmart sends a verification email.
If the mail provider is not configured, the page shows a fallback verification link.

### 3.5 Example

Example registration:

- Name: Alex Chen
- Email: alex@example.com
- Country or Region: United States
- Investor Tier: Professional
- Selected Package: Agent Pro
- Billing Cycle: Monthly

After submission, Alex receives a verification email or a fallback verification link.

## 4. Email Verification

Open `/verify-email?token=...` from the verification email.

### 4.1 What Happens Here

Polysmart validates the token from your email and activates your verified member session.

If verification succeeds:

- Your email is marked as verified
- You are redirected to `/workspace?welcome=1`
- Billing and runtime access can continue

If verification fails:

- The page shows an error message
- You can return to login or register again

### 4.2 Why Verification Matters

Verification is required before you can safely use the member control room.
It acts as the first gate before:

- Recharge flows
- Wallet funding
- Account binding
- Execution-related actions

### 4.3 Example

If the email contains a link such as:

- `https://polysmart.example/verify-email?token=abc123`

Opening it verifies the account and unlocks the next step.

## 5. Member Login

Open `/login`.

### 5.1 Enter Credentials

Provide:

- Email
- Password

### 5.2 Complete Human Verification

Polysmart also asks for a live verification code through the login captcha.
This helps protect member sessions before access is granted.

### 5.3 Sign In

Click `Login`.

If the login is successful, you are redirected to `/workspace`.
If login fails, Polysmart generates a new verification code and asks you to try again.

### 5.4 Example

Example login:

- Email: alex@example.com
- Password: your chosen password
- Verification code: the code shown in the login captcha

After the correct values are entered, the app opens the member workspace.

## 6. Member Workspace

The member workspace is the main operating area at `/workspace`.
It is where you manage membership, billing, account binding, funding, strategy review, and execution evidence.

## 7. Workspace Structure

The workspace is divided into a commercial lane, a funding lane, and a runtime governance lane.

### 7.1 Commercial Workspace

This area covers:

- Subscription plan
- Billing cycle
- Settlement frequency
- Refresh interval
- Self-service fee guardrail
- Billing ledger
- Stripe recharge actions

#### What you can do here

- Change your subscription plan
- Update billing cadence
- Set settlement rhythm
- Adjust the refresh interval
- Review invoices and settlement entries
- Simulate points fee usage
- Start a Stripe recharge session
- Confirm a pending recharge session

#### Example

If you want to move from a monthly to a quarterly billing cycle:

1. Open `Subscription and billing command desk`
2. Choose `Quarterly` in `Billing Cycle`
3. Click `Save Settings`

### 7.2 Recharge Lane

This section is used to purchase execution credits through Stripe.

You can:

- View available points packages
- Start a recharge session
- Confirm a recharge after payment is completed

#### Example

Suppose you need more execution credits:

1. Select a points package
2. Click `Start Recharge`
3. Complete the Stripe checkout in the new tab
4. Return to Polysmart and click `Confirm Recharge` if the pending session is still shown

### 7.3 Funding Workspace

This area is for wallet funding and venue account activation.

It includes:

- Wallet selection
- Deposit address display
- Network and asset selection
- Tracked balance
- Funding threshold
- Sync Wallet action
- Funding and permission unlock summary

#### What funding does

When a wallet is funded and synced, Polysmart can update access permissions such as:

- Query access
- Trade access

#### Example

If your Polymarket wallet is below the funding threshold:

1. Select the wallet in `Choose Recharge Wallet`
2. Deposit the correct asset on the correct network
3. Click `Sync Wallet`
4. Wait for the balance and access status to refresh

### 7.4 Deposit and Unlock Ledger

This ledger shows confirmed wallet top-ups.
It lists:

- Record ID
- Account
- Wallet and network
- Amount
- Permissions
- Confirmation time

Use this area to verify that a deposit has been recognized.

### 7.5 Access Decision Ledger

This ledger shows the access decisions produced by funding syncs and admin overrides.
It helps you check:

- Query status
- Trade status
- Funding threshold
- Access reason

### 7.6 Venue Binding Registry

This is where you manage venue accounts such as:

- Polymarket
- Kalshi
- PredictIt

You can bind or update:

- Platform
- Account label
- Proxy URL
- External account reference
- API key or secret
- Wallet address
- Wallet chain
- Funding asset
- Funding threshold

#### Example

To add a new Kalshi account:

1. Set `Platform` to `Kalshi`
2. Enter a clear `Account Label`
3. Add the wallet address
4. Choose the chain and funding asset
5. Set the funding threshold
6. Click `Bind Account`

After that, you can sync funding from the same registry.

### 7.7 Subscription Posture Snapshot

This panel shows your current state at a glance:

- Plan name
- Service type
- Billing mode
- Next billing date
- Included points
- Referral code

Use this section to confirm that your account is on the expected plan.

### 7.8 Auto-Run Decision Lane

This lane shows AI and orchestrator decisions before live execution.
It may include:

- Execution
- Dry run
- Skip reasons
- AI confidence
- Kelly sizing inputs and outputs

### 7.9 Kelly Sizing Ledger

This section records Kelly-related sizing decisions.
It helps you trace:

- Event ID
- AI confidence
- Bankroll inputs
- Recommended notional
- Halt reasons

### 7.10 Execution Intent Trail

This ledger records execution intent history.
You can review:

- Intent status
- Linked Kelly plan ID
- Order count
- Fill count
- Transaction count
- Final runtime state

### 7.11 Intent Context Ledger

This section shows the AI model and order-book context behind each intent.
It is useful when you want to review why a trade was prepared or blocked.

### 7.12 Managed Commission Ledger

This ledger is for managed-service commission tracking.
It is separate from self-service credits and shows the amounts held for USDT settlement.

### 7.13 T+0 Market Brief

This compact runtime panel shows:

- Current T+0 queue
- Risk stance
- Strongest current edge

### 7.14 Quote, Context, Simulation, and Execution Control

This is the most advanced member execution lane.
You can:

- Prepare a strategy quote
- Load trading context
- Run a simulation
- Create an execution intent
- Sign the intent
- Submit or cancel pending orders

### 7.15 Example: Prepare and Submit a Trade

A typical workflow looks like this:

1. Open `Quote, context, simulation, and execution control`
2. Fill in the quote input values
3. Click the quote or simulation action
4. Load trading context for the selected event and user
5. Create an execution intent
6. Sign the intent
7. Click `Submit Intent`

If you change your mind before execution, you can choose `Cancel Orders` instead.

## 8. Practical Member Workflows

### 8.1 New Member Onboarding

1. Open `/register`
2. Choose a plan
3. Fill in your profile details
4. Accept the disclosure
5. Submit registration
6. Open the verification email
7. Complete the token verification step
8. Log in at `/login`
9. Enter `/workspace`

### 8.2 Add Funds and Prepare Access

1. Open the member console
2. Go to the recharge lane
3. Buy points through Stripe
4. Bind a venue account
5. Add or verify a wallet address
6. Deposit funds on the correct network
7. Click `Sync Wallet`
8. Confirm that trade or query access is enabled

### 8.3 Review a Trade Before Release

1. Go to the execution lane
2. Select an event
3. Load trading context
4. Review Kelly sizing
5. Run the simulation
6. Create and sign the execution intent
7. Submit only if the result matches your risk tolerance

## 9. Admin Usage

Admin access is for the backoffice operator.
Open `/admin/login` first.

## 10. Admin Login

### 10.1 Sign In

Enter the super administrator email and password, then complete the captcha verification.
The seeded super administrator email is:

- `infor@polysmart.io`

After successful login, Polysmart redirects to `/admin`.

### 10.2 Admin Permissions

Only the super administrator can access:

- Member operations
- Account matrix management
- Execution oversight
- Strategy orchestration
- Payments and settlements
- Evidence and audit export
- Production validation records

## 11. Admin Command Center

The admin command center is the primary backoffice surface at `/admin`.

It shows:

- Member and subscription KPIs
- Wallet funding KPIs
- Pending commission
- Platform revenue
- Execution intent counts
- Risk posture
- ECharts spread telemetry
- Grafana observability slot
- LangGraph oracle orchestration state
- Refine workspace map

### 11.1 Main Admin Actions

From the top of the page, the admin can:

- Record a production validation run
- Refresh readiness summaries
- Export an audit CSV

### 11.2 Workspace Shortcuts

The command center links into dedicated backoffice workspaces such as:

- Members + Billing
- Account Matrix
- Execution + Kelly
- Oracle + Strategy
- Payments + Settlements
- Evidence + Audit

### 11.3 Example

If you want to inspect why a production rollout was not yet considered ready:

1. Open `/admin`
2. Review the readiness badges
3. Refresh readiness
4. Open `Evidence + Audit`
5. Export the audit CSV if needed

## 12. Common Buttons and Their Meaning

### Member Surface

- `Register Member`: creates the member identity
- `Login`: signs the member in
- `Save Settings`: stores commercial settings
- `Start Recharge`: launches Stripe checkout
- `Confirm Recharge`: confirms the completed payment
- `Bind Account`: creates or updates a venue binding
- `Sync Wallet`: refreshes wallet and permission state
- `Submit Intent`: submits an execution intent
- `Cancel Orders`: cancels pending orders

### Admin Surface

- `Record Validation Run`: saves a production validation record
- `Refresh Readiness`: reloads readiness metrics
- `Export Audit CSV`: downloads audit evidence

## 13. Troubleshooting

### 13.1 I Cannot Log In

Check the following:

- Email is correct
- Password is correct
- The captcha answer is entered
- The account has already been verified

### 13.2 I Did Not Receive the Verification Email

Try one of these:

- Check spam or promotions folders
- Return to `/register` and inspect whether a fallback verification link is shown
- Regenerate the onboarding flow if necessary

### 13.3 Wallet Sync Does Not Unlock Trading

Make sure:

- The wallet address is bound
- The deposit was made on the correct chain
- The correct asset was used
- The funding threshold has been met
- You clicked `Sync Wallet` after the deposit cleared

### 13.4 Recharge Session Appears Pending

If a Stripe recharge is still pending:

- Finish the checkout flow in the separate tab
- Return to the workspace
- Use `Confirm Recharge` if the session remains visible

### 13.5 Admin Page Redirects Back to Login

This usually means:

- The session expired
- The wrong account was used
- The admin cookie was not established

Log in again at `/admin/login`.

## 14. Example End-to-End Scenario

Here is a complete sample journey for a new member named Alex.

1. Alex opens the homepage.
2. Alex clicks `Start Membership`.
3. Alex chooses `Agent Pro`.
4. Alex fills in profile details and accepts the disclosure.
5. Alex receives a verification email.
6. Alex opens the token link and verifies the account.
7. Alex logs in through `/login`.
8. Alex enters `/workspace`.
9. Alex buys points using Stripe recharge.
10. Alex binds a Polymarket account.
11. Alex adds funds to the correct wallet.
12. Alex clicks `Sync Wallet`.
13. Alex confirms that query and trade access are enabled.
14. Alex reviews a T+0 opportunity, runs a simulation, and submits an execution intent only after checking the Kelly and risk outputs.

## 15. Example Admin Scenario

A backoffice operator wants to review production readiness.

1. Open `/admin/login`
2. Sign in as the super administrator
3. Open `/admin`
4. Review KPIs and risk posture
5. Refresh readiness
6. Record a production validation run
7. Open `Evidence + Audit`
8. Export the audit CSV if needed

## 16. Short Glossary

- `Workspace`: the member operating area
- `Console`: the main control room for commercial and execution actions
- `Binding`: linking a venue account to a Polysmart member
- `Funding sync`: refreshing wallet balance and access status after deposit
- `Recharge`: buying execution credits through Stripe
- `Kelly`: a sizing method used in strategy planning
- `Intent`: a prepared execution action that can be signed and submitted
- `Readiness`: the current production and operational health status

## 17. Need Help

If you are unsure where to start, follow this order:

1. Register
2. Verify email
3. Log in
4. Open the workspace
5. Complete recharge and wallet setup
6. Use the console for strategy and execution
7. Use the admin surface only if you are the operator
