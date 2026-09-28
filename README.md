# PulseTrace — API Observability & Performance Monitoring Platform

PulseTrace is a high-performance, real-time API observability platform for microservices. It delivers zero-overhead telemetry collection, statistical latency percentiles ($p_{50}, p_{75}, p_{90}, p_{95}, p_{99}$), synthetic health monitoring, and automated incident state management.

---

## 🌟 Architecture & Tech Stack

PulseTrace is structured as a Turborepo monorepo using `pnpm`:

```
pulsetrace/
├── apps/
│   ├── api/             # Fastify REST API & WebSocket server
│   ├── worker/          # Telemetry processing worker (Redis Streams -> Prisma/PostgreSQL)
│   └── web/             # Next.js 14 Dashboard (Tailwind CSS, Recharts, Lucide)
├── packages/
│   ├── config/          # Shared TypeScript configurations
│   ├── types/           # Shared TypeScript interfaces & telemetry contracts
│   ├── validation/      # Zod validation schemas
│   ├── database/        # Prisma client, PostgreSQL schema, seed script
│   ├── telemetry/       # Sanitization (SCRUB headers & tokens) & Route normalization
│   ├── metrics/         # Percentiles ($p_{50}$ to $p_{99}$) & Aggregation logic
│   └── sdk-node/        # Non-blocking Node.js SDK (Fastify plugin & Express middleware)
└── infrastructure/
    └── docker-compose.yml # PostgreSQL 16 & Redis 7
```

---

## 🛠️ Quickstart Guide

### Prerequisites
- Node.js `>= 18.0.0`
- `pnpm >= 9.0.0`
- `Docker` & `Docker Compose`

### 1. Install Monorepo Dependencies
```bash
pnpm install
```

### 2. Launch Infrastructure Services (PostgreSQL & Redis)
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### 3. Initialize & Seed PostgreSQL Database
```bash
pnpm db:push
pnpm db:seed
```

Default Seed Credentials:
- **Admin User**: `admin@pulsetrace.io`
- **Password**: `admin123456`
- **Demo Ingestion API Key**: `pt_live_demo12345678901234567890`

### 4. Start Development Cluster (API, Worker, Dashboard)
```bash
pnpm dev
```

---

## 🚀 Monitoring your Node.js App with `@pulsetrace/sdk-node`

### Fastify Integration
```typescript
import Fastify from 'fastify';
import { createPulseTraceFastifyPlugin } from '@pulsetrace/sdk-node';

const app = Fastify();

app.register(
  createPulseTraceFastifyPlugin({
    apiKey: 'pt_live_demo12345678901234567890',
    serviceName: 'order-service',
    environment: 'production',
  })
);
```

### Express Integration
```typescript
import express from 'express';
import { createPulseTraceExpressMiddleware } from '@pulsetrace/sdk-node';

const app = express();

app.use(
  createPulseTraceExpressMiddleware({
    apiKey: 'pt_live_demo12345678901234567890',
    serviceName: 'payment-service',
    environment: 'production',
  })
);
```

---

## 📡 API Endpoints

- **`POST /api/v1/telemetry`**: Non-blocking ingestion endpoint (Returns `202 Accepted` immediately)
- **`GET /api/v1/metrics/summary`**: Global & per-service metric overview
- **`GET /api/v1/metrics/timeseries`**: Timeseries data points for percentiles & throughput
- **`GET /api/v1/metrics/endpoints`**: Endpoint performance leaderboard
- **`WS /ws/metrics`**: Real-time pub/sub metrics stream
- **`GET /health`**: API liveness check
- **`GET /ready`**: API database & Redis readiness check

---

## 🔒 Security & Privacy Guarantees
- **Credential Scrubbing**: `Authorization`, `Cookie`, `X-API-Key`, and sensitive query parameters (`password`, `token`, `secret`) are automatically redacted before ingestion.
- **Hashed Secrets**: Ingestion API keys are never stored in plain text. Hashed with bcrypt and prefix-indexed (`pt_live_`).
