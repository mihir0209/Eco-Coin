# CLAUDE.md - Eco-Coin Project Instructions

## Project Overview
**Eco-Coin** is a full-stack Next.js application for AI-driven electronic waste management, device health monitoring, and Eco-Coin rewards.

## Tech Stack
- **Framework**: Next.js 15.2.4 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI (shadcn/ui), Lucide React
- **Database**: MongoDB (via Mongoose 8.19.1)
- **Local DB Solution**: `mongodb-memory-server` (100% offline support via embedded engine and persistent `./data/db`)
- **Testing**: Vitest (`vitest.config.mjs`)

---

## Essential Commands

### Installation & Environment
```bash
npm install --legacy-peer-deps
```
Configure `.env.local` (local defaults already present):
```env
MONGODB_URI=mongodb://127.0.0.1:27017/ecocoin
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development & Database
```bash
npm run db        # Start standalone persistent local MongoDB (saves to ./data/db)
npm run seed      # Seed or reset database with initial demo data
npm run dev       # Start Next.js development server on http://localhost:3000
```
*Note: If `npm run db` is not running, `lib/mongodb.ts` automatically boots an in-memory Mongo server and auto-seeds initial data.*

### Build & Production
```bash
npm run build     # Compile and build Next.js production bundle
npm run start     # Run Next.js production server
```

### Testing
```bash
npm test          # Run full test suite using Vitest (76 tests across 13 suites)
npm run test:watch # Run Vitest in interactive watch mode
```

---

## Architecture & Conventions

### Directory Layout
- `app/` — Next.js App Router pages and `/api/*` route handlers (including `/api/sync`)
- `components/` — UI components and dialogs (`components/ui/` for shadcn primitives)
- `models/` — Mongoose schemas (`User.ts`, `Device.ts`, `DeviceCode.ts`, `Reward.ts`, `Transaction.ts`, `Notification.ts`, `AuditLedger.ts`)
- `lib/` — Shared helpers (`mongodb.ts`, `device_auth.ts`, `audit_ledger.ts`, `api.ts`, `seed.ts`, `types.ts`, `utils.ts`)
- `scripts/` — Local database daemon (`local-db.js`) and database seeders (`seed-db.js`)
- `tests/` — Vitest unit and integration test suites

### Coding Guidelines
1. **Database Access**: Always invoke `await connectDB()` before executing Mongoose queries in route handlers.
2. **API Routes**: Return consistent JSON responses:
   - Success: `NextResponse.json({ success: true, data: ... }, { status: 200 | 201 })`
   - Errors: `NextResponse.json({ error: 'Message' }, { status: 400 | 401 | 404 | 500 })`
3. **Device Attestation**: Inbound device telemetry uses HMAC-SHA256 signatures over `(payload + timestamp + nonce)` with the device's secret key (`lib/device_auth.ts`). Unauthorized requests must be rejected with 401.
4. **Anti-Replay Ledger**: Timestamp window is strictly ±300s. Nonces are recorded and validated against the `AuditLedger` cryptographic hash chain (`lib/audit_ledger.ts`).
5. **Batch Offline Sync**: Devices upload queued offline events to `POST /api/sync`. Each event is processed idempotently by tracking event nonces in the ledger.
6. **Mongoose Populates**: When using `.populate('modelName')`, ensure the referenced model is imported in the file to prevent Mongoose schema registration issues.
7. **Device Code Format**: Manufacturer codes follow regex `/^[A-Z0-9]{8}-[0-9]{4}$/` (e.g., `APIP1301-2500`, `DELLXPS1-3500`, `LGNVMON2-0800`).
8. **Path Aliasing**: Use `@/` for imports from project root (e.g. `import connectDB from '@/lib/mongodb'`).
