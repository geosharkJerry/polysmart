# Polysmart Full-Stack Ops Console

Commercial-grade implementation for:
- T+0 market ingestion control
- Dual billing modes (performance split vs subscription volume fee)
- Admin settlement and subscription management
- Matrix account binding and health monitoring
- Risk circuit breaker and asset-pool emergency withdrawal
- Strategy quote and hedge state-machine simulation

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS

## Run

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000` (overview)
- `http://localhost:3000/console` (user console)
- `http://localhost:3000/admin` (admin center)

## API Endpoints

- `GET /api/events` - T+0 active opportunity pool
- `GET /api/config` / `PUT /api/config` - scrape interval config
- `GET /api/billing/profile/:userId` / `PUT /api/billing/profile/:userId`
- `POST /api/trades/charge` - subscription mode volume fee deduction
- `GET /api/admin/users` - billing profile list
- `GET /api/admin/settlements` - settlement ledger list
- `GET /api/accounts` / `POST /api/accounts` - matrix account bind + health
- `GET /api/connectors/health` - mock connector health checks
- `GET /api/execution/intents` / `POST /api/execution/intents` - create and view execution intents
- `POST /api/execution/submit` - submit or cancel intent execution
- `GET /api/execution/orders` - execution snapshot by intent
- `GET /api/bus/enqueue` / `POST /api/bus/enqueue` - priority bus snapshot/enqueue
- `POST /api/bus/process` - process next priority bus event
- `GET /api/risk/status` / `POST /api/risk/circuit` - circuit-breaker evaluation
- `GET /api/risk/healing` - self-healing mode and audit logs
- `GET /api/pool/nav` / `POST /api/pool/deposit` / `POST /api/pool/settle`
- `POST /api/strategy/quote` - pricing + rate reduction + order slicing simulation
- `POST /api/strategy/score` - composite priority scoring
- `POST /api/execution/simulate` - hedge state machine simulation
- `POST /api/ai/route` - hybrid AI router selection

## Requirement De-duplication

See `docs/requirements-matrix.md` for merged requirement mapping and conflict cleanup.

## Database Design

See `db/schema.sql` for production schema.

## Service Blueprints

- `services/polysmart_scraper.py` - distributed T+0 market harvester pipeline
- `services/polysmart_billing_vault.py` - volume fee charging and quota halt logic
