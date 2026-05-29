# Polysmart Full-Stack Ops Console

Commercial-grade implementation for:
- T+0 market ingestion control
- Dual billing modes (performance split vs subscription volume fee)
- Admin settlement and subscription management

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
- `POST /api/trades/charge` - subscription mode 1.5% volume fee deduction
- `GET /api/admin/users` - billing profile list for admin center
- `GET /api/admin/settlements` - settlement ledger list

## Database Design

See `db/schema.sql` for production tables.

## Service Blueprints

- `services/polysmart_scraper.py` - distributed T+0 market harvester pipeline
- `services/polysmart_billing_vault.py` - volume fee charging and quota halt logic
