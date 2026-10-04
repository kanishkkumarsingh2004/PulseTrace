# PulseTrace — API Observability & Load Analysis Platform

PulseTrace is a high-performance API analysis platform. Point it at any URL and it discovers that site's endpoints, drives synthetic traffic against them, and reports statistical latency percentiles ($p_{50}, p_{75}, p_{90}, p_{95}, p_{99}$), throughput, error rate, and availability.

Analysis runs entirely in-process. There is nothing to provision, no persistent storage to initialize, and no credentials to configure. Results are returned directly in the API response and rendered in the dashboard.

---

## 🌟 Architecture & Tech Stack

PulseTrace is structured as a Turborepo monorepo using `pnpm`:

```
pulsetrace/
├── apps/
│   ├── api/             # Fastify API — endpoint discovery, load analysis, health
│   └── web/             # Next.js Dashboard (Tailwind CSS, Recharts, Lucide)
└── packages/
    ├── config/          # Shared TypeScript configurations
    ├── types/           # Shared TypeScript interfaces & analysis contracts
    ├── validation/      # Zod validation schemas
    ├── telemetry/       # Sanitization (SCRUB headers & tokens) & Route normalization
    ├── metrics/         # Percentiles ($p_{50}$ to $p_{99}$) & Aggregation logic
    └── sdk-node/        # Non-blocking Node.js SDK (Fastify plugin & Express middleware)
```

---

## 🛠️ Quickstart

### Prerequisites

- Node.js `>= 18.0.0`
- `pnpm >= 9.0.0`

There is nothing else to install or start. PulseTrace has no external service dependencies.

### Install & Run

```bash
pnpm install && pnpm dev
```

That is the whole setup. Once started:

- **Dashboard** — http://localhost:5000
- **API** — http://localhost:4000

### Other Commands

```bash
pnpm build   # Build all apps and packages
pnpm lint    # Lint all apps and packages
pnpm format  # Format with Prettier
```

---

## ⚙️ Environment Variables

PulseTrace ships with working defaults, so `.env` is optional. Copy `.env.example` to `.env` to override them.

| Variable                    | Default                 | Description                          |
| --------------------------- | ----------------------- | ------------------------------------ |
| `PORT`                      | `4000`                  | API server port                      |
| `HOST`                      | `0.0.0.0`               | API bind address                     |
| `NODE_ENV`                  | `development`           | Runtime environment                  |
| `NEXT_PUBLIC_API_URL`       | `http://localhost:4000` | API base URL used by the dashboard   |
| `ANALYSIS_DEFAULT_DURATION` | `10`                    | Default analysis duration in seconds |
| `ANALYSIS_DEFAULT_USERS`    | `1000`                  | Default number of virtual users      |

---

## 🔍 URL-Based Analysis Flow

Analysis is a single synchronous request. No account or credentials of any kind are required.

1. **Enter a URL** — the dashboard accepts any `http`/`https` target, e.g. `https://example.com`.
2. **Discovery** — PulseTrace fetches the target's `robots.txt` and `sitemap.xml` and extracts the endpoint paths (`method`, `path`, `source`). When neither file exists, it falls back to the site's root path.
3. **Load phase** — for the requested duration, virtual users repeatedly hit the discovered endpoints. Each virtual user keeps up to `concurrencyPerUser` requests in flight.
4. **Aggregation** — every request result (`statusCode`, `durationMs`, `responseSize`) is folded into per-endpoint and overall percentile buckets.
5. **Report** — the completed `AnalysisReport` is returned in the response and rendered in the dashboard.

Transport failures (DNS, TCP, TLS, timeout) are recorded with `statusCode: 0` and an `error` reason, so they are visible in `errorRate` and under the `"0"` key of `statusCodes`.

Defaults come from `ANALYSIS_DEFAULT_DURATION` and `ANALYSIS_DEFAULT_USERS` when the request omits them.

---

## 📡 API Endpoints

### `POST /api/v1/analyze`

Runs a load analysis against a target URL and returns the completed report.

**Request**

```json
{
  "url": "https://example.com",
  "durationSeconds": 10,
  "virtualUsers": 50,
  "concurrencyPerUser": 1
}
```

Only `url` is required; the rest fall back to the configured defaults.

**Response**

```json
{
  "data": {
    "targetUrl": "https://example.com",
    "endpointsDiscovered": 12,
    "virtualUsers": 50,
    "durationSeconds": 10,
    "totalRequests": 50000000,
    "rps": 500.4,
    "latency": { "p50": 84, "p75": 142, "p90": 219, "p95": 288, "p99": 512 },
    "errorRate": 0.42,
    "statusCodes": { "200": 4979, "404": 18, "500": 3 },
    "availability": 99.58,
    "perEndpoint": [
      {
        "endpoint": "/products",
        "method": "GET",
        "source": "sitemap",
        "count": 1250,
        "rps": 125.1,
        "latency": {
          "p50": 78,
          "p75": 130,
          "p90": 205,
          "p95": 260,
          "p99": 470
        },
        "minLatencyMs": 31,
        "maxLatencyMs": 903,
        "avgLatencyMs": 96,
        "errorRate": 0.16,
        "statusCodes": { "200": 1248, "500": 2 }
      }
    ],
    "startTime": "2026-10-04T10:00:00.000Z",
    "endTime": "2026-10-04T10:00:10.000Z"
  }
}
```

`latency` values are in milliseconds. `errorRate` and `availability` are percentages from `0` to `100`, where `availability = 100 - errorRate`. `statusCodes` is keyed by status code as a string, with `"0"` holding transport failures.

### `GET /health`

API liveness check. Returns `200` with process status and uptime. No dependency checks are performed.

---

## 📦 Shared Packages

| Package                  | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `@pulsetrace/types`      | Shared interfaces: analysis reports, percentiles, telemetry contracts |
| `@pulsetrace/validation` | Zod schemas for request bodies and query parameters                   |
| `@pulsetrace/metrics`    | Percentile computation and aggregation                                |
| `@pulsetrace/telemetry`  | Header/token scrubbing and route normalization                        |
| `@pulsetrace/config`     | Shared `tsconfig.base.json`                                           |
| `@pulsetrace/sdk-node`   | Non-blocking Node.js SDK (Fastify plugin & Express middleware)        |

---

## 🚀 Monitoring your Node.js App with `@pulsetrace/sdk-node`

### Fastify Integration

```typescript
import Fastify from "fastify";
import { createPulseTraceFastifyPlugin } from "@pulsetrace/sdk-node";

const app = Fastify();

app.register(
  createPulseTraceFastifyPlugin({
    apiKey: "pt_live_your_api_key",
    serviceName: "order-service",
    environment: "production",
  }),
);
```

### Express Integration

```typescript
import express from "express";
import { createPulseTraceExpressMiddleware } from "@pulsetrace/sdk-node";

const app = express();

app.use(
  createPulseTraceExpressMiddleware({
    apiKey: "pt_live_your_api_key",
    serviceName: "payment-service",
    environment: "production",
  }),
);
```

---

## 🔒 Security & Privacy Guarantees

- **Credential Scrubbing**: `Authorization`, `Cookie`, `X-API-Key`, and sensitive query parameters (`password`, `token`, `secret`) are automatically redacted before ingestion.
- **In-Memory Only**: Analysis results live in process memory and are never written to disk or transmitted anywhere except the dashboard that requested them.
- **Read-Only Targeting**: The analyzer issues only `GET`/`HEAD`-style discovery plus synthetic load traffic against the URL you supply. Point it at a target you are authorized to test.
