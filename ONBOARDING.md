# Eco-Coin - Codebase Onboarding Guide

Welcome to **Eco-Coin**, an AI-driven e-waste management application built with Next.js, React, Tailwind CSS, TypeScript, and MongoDB. This guide provides a comprehensive overview of the system architecture, directory structure, data flows, offline local database setup, and common development workflows.

---

## 1. System Overview & Tech Stack

Eco-Coin empowers individuals and organizations to monitor device health, receive predictive End-of-Life (EOL) alerts, and recycle electronic waste in exchange for **Eco-Coins** (a digital rewards currency) and CO₂ savings metrics.

### Core Technologies
- **Runtime**: Node.js 18+ (tested on Node.js 22 LTS)
- **Framework**: Next.js 15.2.4 (App Router)
- **Frontend / UI**: React 19, Tailwind CSS 4, Radix UI primitives, Lucide React icons, Sonner toast notifications, Recharts
- **Backend**: Next.js Server Route Handlers (`app/api/*`)
- **Database & ODM**: MongoDB with Mongoose 8.19.1
- **100% Offline / Local Database Solution**: `mongodb-memory-server` with wiredTiger persistent storage engine (`./data/db`) and automatic in-process fallback
- **Testing**: Vitest with `@/` path aliasing support

---

## 2. Architecture & Data Flow

Eco-Coin is designed as a unified full-stack Next.js monolith. The frontend interacts directly with RESTful Route Handlers under `/api/*`, which communicate with MongoDB via Mongoose schemas.

```
┌────────────────────────────────────────────────────────┐
│                   Browser / Client                     │
│  app/page.tsx, components/register-device.tsx, etc.   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP Fetch (lib/api.ts)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Next.js Route Handlers                   │
│  app/api/auth/*, app/api/devices/*, app/api/rewards/*  │
└──────────────────────────┬─────────────────────────────┘
                           │ Mongoose ODM
                           ▼
┌────────────────────────────────────────────────────────┐
│            Local Database Adapter (lib/mongodb.ts)     │
│  Connects to mongodb://127.0.0.1:27017/ecocoin         │
│  Auto-fallback to in-memory MongoMemoryServer          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│       Local MongoDB (Persistent ./data/db or In-Memory)│
└────────────────────────────────────────────────────────┘
```

### End-to-End Request Flow (Device Recycling Example)
1. **User Action**: The user clicks "Recycle Now" on a critical device in `app/page.tsx`.
2. **API Request**: `deviceApi.recycle(deviceId, userId)` sends `POST /api/devices/recycle` with `{ deviceId, userId }`.
3. **Connection Check**: Handler invokes `await connectDB()` in `lib/mongodb.ts`, ensuring MongoDB connectivity.
4. **Validation**: The handler checks device status, verifying that `isRecycled` is not already `true`.
5. **Business Logic & Persistence**:
   - `Device.findByIdAndUpdate` sets `isRecycled: true` and records `recycledAt`.
   - `User.findByIdAndUpdate` credits `user.totalEcoCoins += device.ecoCoins`, increments `devicesRecycled`, and adds CO₂ saved (`+0.5kg`).
   - `Transaction.create` logs an audit record with `type: 'recycle'`.
   - `Notification.updateMany` marks pending critical device notifications as read.
6. **Response**: JSON payload with updated device state, awarded coins, and new balance.
7. **Client State Update**: React state refreshes the device grid, total balance, and trigger toast notifications.

---

## 3. Directory Structure

```
Eco-Coin/
├── app/                        # Next.js App Router
│   ├── api/                    # REST API route handlers
│   │   ├── auth/               # Authentication endpoints (login, register)
│   │   ├── dashboard/          # Aggregated dashboard metrics & analytics
│   │   ├── devices/            # Device management & registration
│   │   │   ├── recycle/        # Device recycling & coin reward action
│   │   │   └── register/       # Manufacturer code validation & registration
│   │   ├── notifications/      # User notification alerts
│   │   ├── rewards/            # Marketplace rewards catalogue
│   │   │   └── redeem/         # Reward redemption action
│   │   ├── transactions/       # Transaction history audit log
│   │   └── users/              # User profile CRUD
│   ├── login/                  # User login page
│   ├── register/               # User registration page
│   ├── globals.css             # Tailwind CSS global stylesheet
│   ├── layout.tsx              # Root HTML layout and providers
│   └── page.tsx                # Main dashboard single-page interface
├── components/                 # Reusable React UI components
│   ├── register-device.tsx     # Device registration modal (manual & QR code)
│   ├── theme-provider.tsx      # Dark/light theme context wrapper
│   └── ui/                     # shadcn/ui Radix primitive wrappers
├── hooks/                      # Custom React hooks (use-toast, use-mobile)
├── lib/                        # Shared utility libraries
│   ├── api.ts                  # Client-side typed API fetcher functions
│   ├── mongodb.ts              # Local database connection manager & fallback
│   ├── seed.ts                 # Database seed definition & auto-seeder
│   ├── types.ts                # TypeScript interface declarations
│   └── utils.ts                # Style & class merging helpers (clsx, tailwind-merge)
├── models/                     # Mongoose Schema & Data Models
│   ├── Device.ts               # User electronic devices schema
│   ├── DeviceCode.ts           # Manufacturer verification codes schema
│   ├── Notification.ts         # User alerts schema
│   ├── Reward.ts               # Marketplace reward item schema
│   ├── Transaction.ts          # Points ledger transaction history schema
│   └── User.ts                 # User profile schema
├── public/                     # Static media and SVG placeholders
├── scripts/                    # CLI & database scripts
│   ├── local-db.js             # Standalone local persistent MongoDB daemon
│   ├── seed-db.js              # Standalone database seed CLI script
│   └── seed-db-fn.js           # Reusable data seeder function
├── tests/                      # Automated test suite (Vitest)
│   ├── api/                    # API route handler integration tests
│   ├── db.test.ts              # Database connection & pooling tests
│   ├── models.test.ts          # Mongoose schema validation tests
│   └── utils.test.ts           # Helper & utility tests
├── .env.example                # Template environment variables
├── .env.local                  # Local offline configuration (auto-configured)
├── next.config.mjs             # Next.js configuration
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler options
└── vitest.config.mjs           # Test runner configuration
```

---

## 4. Local Database Architecture (100% Offline)

To guarantee complete offline execution without external network or MongoDB Atlas dependencies:

1. **Embedded MongoDB Binary**: Powered by `mongodb-memory-server`, utilizing the pre-bundled `mongod` binary with zero external dependencies.
2. **Dual-Mode Connectivity in `lib/mongodb.ts`**:
   - **Mode A (Daemon Mode)**: Connects directly to `mongodb://127.0.0.1:27017/ecocoin` if the standalone daemon is active.
   - **Mode B (Embedded Fallback Mode)**: If no server is listening on port 27017, `lib/mongodb.ts` automatically starts an in-process `MongoMemoryServer` instance and caches the handle globally.
3. **Automatic Demo Seeding**: Whenever an empty database is detected upon connection, `autoSeedIfEmpty()` automatically seeds the default user, 3 devices, manufacturer codes, rewards, and notifications.
4. **Persistent Local Database (`npm run db`)**:
   Runs a standalone MongoDB daemon that saves all collections to `./data/db` using the WiredTiger storage engine, preserving records across server reboots.

---

## 5. Common Development Tasks

### 1. Starting the Persistent Local DB
```bash
npm run db
```

### 2. Starting the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Default demo credentials:
- **Email**: `mihir.patil22@pccoepune.org`
- **Password**: `password123`

### 3. Running Database Seeding
```bash
npm run seed
```

### 4. Running the Test Suite
```bash
npm test
```

### 5. Creating a Production Build
```bash
npm run build
```

---

## 6. Key Conventions & Best Practices

- **API Responses**: Always return structured JSON: `{ success: boolean, data?: T, error?: string }`.
- **Database Connection**: Always `await connectDB()` inside Route Handlers before interacting with models.
- **Model Registration**: When using `.populate()` across models, ensure referenced models are imported in the route handler file to avoid `MissingSchemaError`.
- **Environment Variables**: Configure all local URLs and connection strings in `.env.local` (never commit `.env.local` to git).
