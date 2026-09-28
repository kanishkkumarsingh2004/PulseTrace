# PulseTrace

# Architecture Specification

**Project:** PulseTrace
**Type:** API Observability & Performance Monitoring Platform
**Version:** 1.0.0
**Architecture:** Monorepo + Event-Driven Telemetry Pipeline
**Frontend:** Next.js
**Backend:** Node.js + Fastify
**Language:** TypeScript
**Package Manager:** pnpm
**Monorepo:** Turborepo

---

# 1. Architecture Overview

PulseTrace is divided into two fundamentally different systems:

```text
┌─────────────────────────────────────────────────────────────┐
│                      PULSETRACE                             │
├──────────────────────────────┬──────────────────────────────┤
│      Control Plane           │       Data Plane              │
│                              │                              │
│ Projects                     │ Telemetry Ingestion          │
│ Users                        │ Metric Processing             │
│ API Keys                     │ Aggregation                   │
│ Services                     │ Real-time Streaming           │
│ Alerts                       │ Historical Metrics            │
│ Dashboards                   │ Resource Metrics              │
│ Settings                     │                               │
└──────────────────────────────┴──────────────────────────────┘
```

This separation is critical.

The **control plane** manages the application.

The **data plane** handles potentially high-volume telemetry.

Telemetry traffic must never be allowed to block normal dashboard operations.

---

# 2. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │     End Users       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Next.js Web      │
                         │     Dashboard       │
                         └──────────┬──────────┘
                                    │
                          HTTPS / WebSocket
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │       Node.js Gateway        │
                    │          Fastify             │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       Control Plane         Telemetry API        WebSocket
              │                    │                    │
              ▼                    ▼                    │
         PostgreSQL             Stream                │
              │                    │                    │
              │                    ▼                    │
              │              Metric Workers            │
              │                    │                    │
              │          ┌─────────┴─────────┐          │
              │          │                   │          │
              │          ▼                   ▼          │
              │        Redis             Metrics DB     │
              │          │                   │          │
              │          └─────────┬─────────┘          │
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
                            Dashboard Updates
```

---

# 3. Architectural Principles

PulseTrace follows these principles.

## 3.1 Separation of Concerns

Each subsystem should have one primary responsibility.

```text
Next.js
    → UI

Fastify
    → API

Telemetry Ingestion
    → Receive telemetry

Stream
    → Buffer telemetry

Metric Workers
    → Process telemetry

Redis
    → Hot state / realtime

PostgreSQL
    → Application metadata

Analytics Storage
    → Historical telemetry
```

---

# 4. Control Plane

The control plane manages configuration and application state.

```text
Control Plane
│
├── Authentication
├── Users
├── Projects
├── Environments
├── Services
├── Endpoints
├── API Keys
├── Alert Rules
├── Incidents
├── Dashboards
└── Settings
```

Primary storage:

```text
PostgreSQL
```

ORM:

```text
Prisma
```

---

# 5. Data Plane

The data plane handles telemetry.

```text
Data Plane
│
├── Telemetry ingestion
├── Validation
├── Authentication
├── Normalization
├── Queueing
├── Aggregation
├── Metric calculation
├── Resource metrics
├── Alert evaluation
└── Realtime publishing
```

The data plane must be independently scalable.

---

# 6. Monorepo Architecture

PulseTrace uses a pnpm workspace with Turborepo.

```text
pulsetrace/
│
├── apps/
│   │
│   ├── web/
│   │
│   ├── api/
│   │
│   └── worker/
│
├── packages/
│   │
│   ├── database/
│   ├── telemetry/
│   ├── metrics/
│   ├── sdk-node/
│   ├── types/
│   ├── config/
│   ├── validation/
│   └── ui/
│
├── infrastructure/
│
├── prisma/
│
├── scripts/
│
├── docs/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

# 7. Application Responsibilities

## 7.1 `apps/web`

Next.js dashboard.

Responsibilities:

```text
Dashboard UI
Authentication UI
Project management
Service monitoring
Endpoint monitoring
Metric visualization
Alert management
Settings
```

It must not directly communicate with databases.

```text
Web
 ↓
API
 ↓
Database
```

Never:

```text
Web
 ↓
PostgreSQL
```

---

# 8. API Server

Location:

```text
apps/api/
```

Technology:

```text
Node.js
Fastify
TypeScript
```

Responsibilities:

```text
REST API
Authentication
Authorization
Project management
API key management
Telemetry ingestion
Metric queries
Alert management
Health checks
WebSocket gateway
```

---

# 9. API Internal Structure

```text
apps/api/src/
│
├── server.ts
│
├── app.ts
│
├── config/
│
├── routes/
│   ├── auth.routes.ts
│   ├── projects.routes.ts
│   ├── services.routes.ts
│   ├── endpoints.routes.ts
│   ├── metrics.routes.ts
│   ├── telemetry.routes.ts
│   ├── alerts.routes.ts
│   ├── incidents.routes.ts
│   └── health.routes.ts
│
├── controllers/
│
├── services/
│
├── middleware/
│
├── plugins/
│
├── websocket/
│
└── utils/
```

---

# 10. Worker Service

Location:

```text
apps/worker/
```

The worker must not run inside the main API process.

Responsibilities:

```text
Telemetry processing
Metric aggregation
Percentile calculation
Alert evaluation
Data retention
Realtime publishing
```

Architecture:

```text
Telemetry
    ↓
Queue
    ↓
Worker
    ↓
Processing
    ↓
Storage
```

---

# 11. Telemetry Flow

The most important pipeline is:

```text
Application
    │
    ▼
PulseTrace SDK
    │
    ▼
Telemetry Middleware
    │
    ▼
Ingestion API
    │
    ▼
Validation
    │
    ▼
Normalization
    │
    ▼
Queue / Stream
    │
    ▼
Metric Worker
    │
    ├───────────────┐
    ▼               ▼
Redis           Analytics DB
    │               │
    ▼               ▼
Realtime        Historical
Dashboard       Analysis
```

---

# 12. Node.js SDK Architecture

The Node.js SDK should provide automatic instrumentation.

```text
packages/sdk-node/
│
├── src/
│   ├── client.ts
│   ├── middleware.ts
│   ├── transport.ts
│   ├── instrumentation/
│   ├── batching/
│   ├── queue/
│   ├── masking/
│   └── index.ts
│
└── package.json
```

---

# 13. SDK Request Lifecycle

For every monitored request:

```text
Incoming Request
       │
       ▼
Start Timer
       │
       ▼
Execute Application
       │
       ▼
Capture Response
       │
       ▼
Calculate Duration
       │
       ▼
Create Telemetry Event
       │
       ▼
Apply Data Masking
       │
       ▼
Batch Event
       │
       ▼
Send to PulseTrace
```

---

# 14. SDK Must Not Block Requests

Telemetry collection must be asynchronous.

Bad:

```text
Request
 ↓
Send telemetry
 ↓
Wait for PulseTrace
 ↓
Return response
```

Correct:

```text
Request
 ↓
Application
 ↓
Response

Telemetry
 ↓
Background batch
 ↓
PulseTrace
```

A PulseTrace outage must not cause the user's API to fail.

---

# 15. Telemetry Batching

The SDK should batch telemetry.

Example:

```text
Request 1 ─┐
Request 2 ─┤
Request 3 ─┤
Request 4 ─┤
Request 5 ─┘
      │
      ▼
Batch
      │
      ▼
PulseTrace
```

Batching reduces:

```text
Network requests
CPU overhead
Connection overhead
Ingestion overhead
```

---

# 16. SDK Backpressure

If PulseTrace is unavailable:

```text
Application
    │
    ▼
SDK Buffer
    │
    ├── Retry
    ├── Backoff
    └── Drop according to policy
```

The SDK must have bounded memory.

Never allow unlimited telemetry buffering.

---

# 17. Ingestion API

Endpoint:

```http
POST /api/v1/telemetry
```

Responsibilities:

```text
Authenticate API key
Validate payload
Apply limits
Normalize telemetry
Push into stream
Return acknowledgement
```

It should not perform expensive metric calculations synchronously.

---

# 18. Ingestion Pipeline

```text
HTTP Request
    │
    ▼
API Key Validation
    │
    ▼
Schema Validation
    │
    ▼
Payload Size Check
    │
    ▼
Data Normalization
    │
    ▼
Queue
    │
    ▼
HTTP 202
```

`202 Accepted` should be preferred because ingestion means accepted for processing, not necessarily fully processed.

---

# 19. Telemetry Stream

The telemetry stream decouples ingestion from processing.

Initial implementation:

```text
Redis Streams
```

Future high-scale option:

```text
Kafka
```

Architecture:

```text
Ingestion API
      │
      ▼
Redis Stream
      │
      ├── Worker A
      ├── Worker B
      └── Worker C
```

---

# 20. Why Redis Streams First

Redis Streams are appropriate for the initial system because they provide:

```text
Low operational complexity
Consumer groups
Message ordering within streams
Acknowledgements
Fast reads/writes
```

Kafka should not be introduced merely because this is an observability product.

Use Kafka when actual ingestion volume and operational requirements justify it.

---

# 21. Metric Processing

Workers consume telemetry.

```text
Telemetry Event
      │
      ▼
Normalization
      │
      ├── Request count
      ├── Error count
      ├── Latency
      ├── Throughput
      ├── Status codes
      └── Resource metrics
```

---

# 22. Metric Aggregation

Telemetry should be grouped into time buckets.

Example:

```text
Bucket:
10:00:00 → 10:00:05

Requests:
423

Errors:
7

Average latency:
128ms

P95:
291ms

P99:
482ms
```

The bucket size should be configurable.

Initial buckets:

```text
1 second
5 seconds
1 minute
5 minutes
1 hour
```

---

# 23. Latency Processing

The system should not rely only on average latency.

For each aggregation bucket:

```text
count
min
max
sum
P50
P75
P90
P95
P99
```

Percentiles should use an efficient approximate data structure at high volume rather than sorting millions of raw records for every dashboard query.

---

# 24. Resource Metric Pipeline

Resource metrics follow a separate pipeline.

```text
Node.js Runtime
      │
      ├── CPU
      ├── Memory
      ├── Heap
      ├── Event Loop
      └── Network
            │
            ▼
       Telemetry
            │
            ▼
       Aggregation
            │
            ▼
         Storage
```

---

# 25. Redis Architecture

Redis has multiple responsibilities.

```text
Redis
│
├── Hot metrics
├── Realtime metric state
├── Pub/Sub
├── Telemetry Streams
├── Rate limiting
└── Temporary state
```

Redis should not become the permanent historical telemetry database.

---

# 26. PostgreSQL Architecture

PostgreSQL stores metadata.

```text
PostgreSQL
│
├── Users
├── Projects
├── Environments
├── Services
├── Endpoints
├── API Keys
├── Alert Rules
├── Incidents
├── Health Checks
├── Dashboards
└── Dashboard Widgets
```

PostgreSQL should not store every high-frequency telemetry event indefinitely.

---

# 27. Analytics Storage

The architecture should support a dedicated telemetry database.

Preferred future technology:

```text
ClickHouse
```

Flow:

```text
Metric Worker
      │
      ▼
ClickHouse
      │
      ▼
Historical Analytics
```

ClickHouse is appropriate because telemetry workloads are generally:

```text
High write volume
Time-oriented
Read-heavy analytics
Aggregation-heavy
Column-oriented
```

---

# 28. Storage Evolution

### MVP

```text
PostgreSQL
+
Redis
```

### Production

```text
PostgreSQL
+
Redis
+
ClickHouse
```

### Large Scale

```text
PostgreSQL
+
Redis
+
Kafka
+
ClickHouse
```

The architecture should not require Kafka or ClickHouse on day one.

---

# 29. WebSocket Architecture

The dashboard receives live metrics through WebSockets.

```text
Metric Worker
      │
      ▼
Redis Pub/Sub
      │
      ▼
WebSocket Gateway
      │
      ├── Dashboard A
      ├── Dashboard B
      └── Dashboard C
```

The worker should not maintain browser connections directly.

---

# 30. WebSocket Channels

Logical channels:

```text
project:{projectId}

service:{serviceId}

endpoint:{endpointId}
```

Example:

```text
project:proj_123
```

A dashboard subscribes only to the metrics it needs.

---

# 31. WebSocket Event

```json
{
  "type": "metric.update",
  "projectId": "proj_123",
  "serviceId": "svc_123",
  "timestamp": 1760000000,
  "metrics": {
    "rps": 42.1,
    "errorRate": 1.2,
    "p95": 241,
    "p99": 492
  }
}
```

---

# 32. Reconnection Strategy

WebSocket clients must support:

```text
Connection
    ↓
Disconnect
    ↓
Exponential backoff
    ↓
Reconnect
    ↓
Resubscribe
    ↓
Fetch missed historical interval
```

Do not assume WebSocket connections remain permanent.

---

# 33. REST vs WebSocket

REST should handle:

```text
Projects
Services
Endpoints
Historical metrics
Alerts
Settings
Configuration
```

WebSocket should handle:

```text
Live metrics
Live alerts
Incident state changes
Live service status
```

---

# 34. Dashboard Data Flow

```text
Next.js
   │
   ├── REST
   │    └── Historical data
   │
   └── WebSocket
        └── Live data
```

When opening a dashboard:

```text
1. Load historical data through REST
2. Render graph
3. Open WebSocket
4. Subscribe to live stream
5. Append new metric buckets
```

This prevents the dashboard from starting empty.

---

# 35. Dashboard Rendering Strategy

The browser should maintain a bounded in-memory graph window.

Example:

```text
Last 5 minutes
```

The client should not continuously retain millions of points.

Old points should be discarded or replaced by server-side aggregates.

---

# 36. API Query Architecture

Historical query:

```text
Browser
   │
   ▼
Next.js
   │
   ▼
Fastify
   │
   ▼
Metrics Service
   │
   ▼
Analytics Storage
```

The API should determine the appropriate aggregation resolution.

Example:

```text
5 minutes
→ 1-second buckets

24 hours
→ 1-minute buckets

30 days
→ 1-hour buckets
```

Never return unnecessary high-resolution data.

---

# 37. Metrics Service

Location:

```text
packages/metrics/
```

Responsibilities:

```text
Metric definitions
Aggregation logic
Percentile calculation
Rate calculations
Time bucket logic
Metric validation
```

The metric calculation logic should be shared between workers and query services where appropriate.

---

# 38. Alert Architecture

```text
Telemetry
   │
   ▼
Metric Aggregation
   │
   ▼
Alert Evaluator
   │
   ▼
Rule Match
   │
   ├── No
   │
   └── Yes
        │
        ▼
      Alert
        │
        ▼
     Incident
        │
        ▼
   Notification
```

---

# 39. Alert Evaluation

Example:

```text
Metric:
P95 latency

Threshold:
500ms

Duration:
5 minutes
```

The alert evaluator should not trigger because of a single spike if the configured duration is five minutes.

---

# 40. Alert State Machine

```text
             ┌─────────────┐
             │     OK      │
             └──────┬──────┘
                    │
              threshold hit
                    │
                    ▼
             ┌─────────────┐
             │  TRIGGERED  │
             └──────┬──────┘
                    │
                acknowledged
                    │
                    ▼
             ┌─────────────┐
             │ ACKNOWLEDGED│
             └──────┬──────┘
                    │
               metric normal
                    │
                    ▼
             ┌─────────────┐
             │  RESOLVED   │
             └─────────────┘
```

---

# 41. Incident Architecture

An incident is a persistent representation of an alert condition.

```text
Alert Rule
    │
    ▼
Violation
    │
    ▼
Incident
    │
    ├── Started
    ├── Acknowledged
    ├── Resolved
    └── Duration
```

---

# 42. Health Check Architecture

Synthetic monitoring operates independently from SDK telemetry.

```text
Scheduler
    │
    ▼
Health Check Worker
    │
    ▼
HTTP Request
    │
    ▼
Result
    │
    ├── Status
    ├── Latency
    └── Error
    │
    ▼
Metrics
```

---

# 43. Scheduler

Health checks should not rely on browser activity.

```text
Scheduler
    ↓
Queue
    ↓
Worker
```

This guarantees that health checks continue even when no dashboard is open.

---

# 44. Authentication Architecture

Two authentication mechanisms exist.

## Dashboard Authentication

```text
User
 ↓
Login
 ↓
Session
 ↓
Dashboard
```

## Telemetry Authentication

```text
Application
 ↓
API Key
 ↓
Ingestion API
```

These must remain separate.

---

# 45. API Key Architecture

Each key belongs to a project.

```text
Project
   │
   ├── API Key A
   ├── API Key B
   └── API Key C
```

Keys should support:

```text
Create
Rotate
Revoke
Last used
Created date
Environment scope
```

---

# 46. API Key Validation

Request:

```text
Authorization: Bearer <key>
```

Flow:

```text
Request
  │
  ▼
Extract Key
  │
  ▼
Hash Key
  │
  ▼
Lookup
  │
  ▼
Validate
  │
  ▼
Resolve Project
```

Raw API keys should never be logged.

---

# 47. Data Privacy Architecture

Telemetry passes through a masking layer.

```text
Raw Event
   │
   ▼
Sensitive Data Detector
   │
   ▼
Masking
   │
   ▼
Normalized Event
```

Default redaction:

```text
authorization
cookie
set-cookie
password
token
secret
api-key
```

Users may configure additional fields.

---

# 48. Multi-Tenant Isolation

Every resource must be scoped.

```text
User
 ↓
Organization
 ↓
Project
 ↓
Environment
 ↓
Service
 ↓
Endpoint
```

Every database query must verify ownership/access scope.

Never trust:

```text
projectId
serviceId
endpointId
```

provided by the client without authorization checks.

---

# 49. Rate Limiting

Rate limiting should exist at multiple levels.

```text
Internet
   │
   ▼
Reverse Proxy
   │
   ▼
API
   │
   ▼
Project/API Key
```

Limits:

```text
Authentication requests
Telemetry requests
Dashboard queries
WebSocket connections
Health checks
```

---

# 50. Failure Isolation

A failure in one component should not cascade.

Example:

```text
ClickHouse unavailable
        │
        ▼
Historical analytics degraded
        │
        X
        │
        └── Dashboard authentication still works
```

Similarly:

```text
Redis unavailable
        │
        ▼
Realtime metrics degraded
        │
        └── Historical REST queries can continue
```

---

# 51. Telemetry Loss Policy

Telemetry is not equally important at every level.

The platform should define:

```text
Critical
Important
Best-effort
```

For MVP:

```text
Telemetry ingestion = best-effort
Application request = never blocked
```

A monitored API must continue operating if PulseTrace is unavailable.

---

# 52. Backpressure Architecture

```text
Telemetry
   │
   ▼
Queue
   │
   ├── Queue healthy
   │       ↓
   │     Process
   │
   └── Queue overloaded
           ↓
       Backpressure
           ↓
       Sampling/Drop
```

The system should prefer controlled telemetry loss over taking down the monitored application.

---

# 53. Sampling

At high traffic levels, PulseTrace should support sampling.

Example:

```text
Traffic:
100,000 requests/sec

Sampling:
10%

Observed:
10,000 requests/sec
```

However, critical errors should be retained at a higher sampling rate or retained separately.

Sampling must be explicitly represented in metric calculations.

---

# 54. Health Architecture

Every service should expose:

```text
/health
```

and optionally:

```text
/ready
```

Example:

```text
/health
→ Process alive

/ready
→ Dependencies available
```

---

# 55. Internal Observability

PulseTrace itself must emit metrics.

```text
PulseTrace
    │
    ├── API latency
    ├── Telemetry ingestion rate
    ├── Worker throughput
    ├── Queue depth
    ├── Redis latency
    ├── PostgreSQL latency
    ├── Analytics DB latency
    ├── WebSocket connections
    └── Dropped telemetry
```

A monitoring platform that cannot monitor itself is architecturally incomplete.

---

# 56. Deployment Architecture — Development

```text
Docker Compose
│
├── Next.js
├── Node.js API
├── Worker
├── PostgreSQL
└── Redis
```

Optional:

```text
ClickHouse
```

---

# 57. Deployment Architecture — Production

```text
                  Internet
                     │
                     ▼
               Load Balancer
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      Web/API Node           Web/API Node
          │                     │
          └──────────┬──────────┘
                     │
              Telemetry Stream
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Worker      Worker      Worker
          │          │          │
          └──────────┼──────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Redis               ClickHouse
          │
          ▼
    WebSocket Gateway

              PostgreSQL
           Control Plane Data
```

---

# 58. Horizontal Scaling

API servers should be stateless.

```text
API 1
API 2
API 3
API 4
```

Any request should be processable by any API instance.

Shared state belongs in:

```text
Redis
PostgreSQL
Analytics DB
```

---

# 59. Worker Scaling

Workers should use consumer groups.

```text
Stream
 │
 ├── Worker 1
 ├── Worker 2
 ├── Worker 3
 └── Worker 4
```

Scaling workers should increase processing capacity without changing application behavior.

---

# 60. Database Migrations

Prisma migrations manage application schema.

```text
packages/database/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
└── src/
```

Telemetry schema migrations should be handled separately if ClickHouse is introduced.

---

# 61. Configuration Architecture

Configuration must be environment-based.

```text
.env
.env.local
.env.production
```

Examples:

```text
DATABASE_URL
REDIS_URL
TELEMETRY_STREAM
JWT_SECRET
API_KEY_SECRET
WEBSOCKET_URL
CLICKHOUSE_URL
```

Secrets must never be committed to Git.

---

# 62. Environment Separation

```text
Development
Staging
Production
```

Each environment should have separate:

```text
Database
Redis
API keys
Telemetry
WebSocket namespace
```

Production telemetry must never accidentally enter development storage.

---

# 63. API Versioning

Use:

```text
/api/v1/
```

Example:

```text
/api/v1/projects
/api/v1/telemetry
/api/v1/metrics
```

Breaking changes require a new API version.

---

# 64. Error Architecture

API errors should follow a consistent format.

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The supplied API key is invalid.",
    "requestId": "req_123"
  }
}
```

Internal stack traces must never be returned in production.

---

# 65. Request IDs

Every PulseTrace API request should receive:

```text
requestId
```

Example:

```text
X-Request-ID: req_01HXYZ
```

The request ID should appear in logs and error responses.

---

# 66. Logging Architecture

Application logs should be structured.

Example:

```json
{
  "timestamp": "2026-09-28T10:30:00Z",
  "level": "info",
  "service": "api",
  "requestId": "req_123",
  "message": "Telemetry batch accepted"
}
```

Avoid uncontrolled `console.log()` statements in production code.

---

# 67. Security Boundaries

```text
                    Internet
                       │
                 ┌─────▼─────┐
                 │   Proxy   │
                 └─────┬─────┘
                       │
              ┌────────▼────────┐
              │    API Layer    │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PostgreSQL        Redis        Telemetry
                                      │
                                      ▼
                                Analytics DB
```

Databases should never be publicly accessible.

---

# 68. Testing Architecture

Testing layers:

```text
Unit Tests
Integration Tests
API Tests
SDK Tests
Worker Tests
WebSocket Tests
End-to-End Tests
Load Tests
```

---

# 69. Critical Load Tests

The telemetry pipeline must be tested under:

```text
1,000 events/sec
5,000 events/sec
10,000 events/sec
50,000 events/sec
```

The actual production limit should be determined through measurement, not assumed.

Measure:

```text
CPU
Memory
Queue depth
Processing latency
Dropped events
Database throughput
```

---

# 70. End-to-End Flow

Complete request lifecycle:

```text
                  MONITORED APPLICATION
                           │
                           ▼
                    PulseTrace SDK
                           │
                           ▼
                     HTTP Request
                           │
                           ▼
                    Telemetry Event
                           │
                           ▼
                    Ingestion API
                           │
                     API Key Check
                           │
                     Schema Check
                           │
                           ▼
                    Redis Stream
                           │
                           ▼
                     Metric Worker
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
          Metrics        Alerts         Storage
             │             │              │
             ▼             ▼              ▼
          Redis         Incident      ClickHouse
             │
             ▼
       WebSocket Gateway
             │
             ▼
       Next.js Dashboard
```

---

# 71. Recommended Initial Build Order

## Stage 1

```text
pnpm workspace
Turborepo
Next.js
Fastify
PostgreSQL
Prisma
Redis
Docker
```

---

## Stage 2

Build:

```text
Authentication
Projects
Services
Endpoints
API Keys
```

---

## Stage 3

Build:

```text
Node SDK
HTTP middleware
Telemetry schema
Ingestion endpoint
```

---

## Stage 4

Build:

```text
Redis Streams
Telemetry worker
Metric aggregation
```

---

## Stage 5

Build:

```text
Metrics API
Historical queries
Dashboard charts
```

---

## Stage 6

Build:

```text
WebSocket
Realtime metrics
Live dashboard
```

---

## Stage 7

Build:

```text
Alert rules
Alert evaluator
Incidents
```

---

## Stage 8

Build:

```text
Resource monitoring
Synthetic health checks
```

---

## Stage 9

Only after the MVP has real load:

```text
ClickHouse
Advanced sampling
Multiple workers
Kafka/NATS if required
Horizontal scaling
```

---

# 72. Architectural Decision Summary

| Component       | Technology                   | Responsibility                   |
| --------------- | ---------------------------- | -------------------------------- |
| Web             | Next.js                      | Dashboard                        |
| UI              | React + Tailwind + shadcn/ui | Interface                        |
| API             | Node.js + Fastify            | REST/API gateway                 |
| Realtime        | WebSocket                    | Live metrics                     |
| SDK             | TypeScript                   | Telemetry collection             |
| ORM             | Prisma                       | Application DB access            |
| Metadata DB     | PostgreSQL                   | Control plane                    |
| Cache           | Redis                        | Hot state                        |
| Stream          | Redis Streams                | Telemetry buffering              |
| Worker          | Node.js                      | Metric processing                |
| Analytics       | ClickHouse                   | High-volume historical telemetry |
| Monorepo        | Turborepo                    | Workspace orchestration          |
| Package manager | pnpm                         | Dependency management            |
| Deployment      | Docker                       | Containerization                 |

---

# 73. Final Architecture

The final intended architecture is:

```text
                         PULSETRACE
                              │
             ┌────────────────┴────────────────┐
             │                                 │
       CONTROL PLANE                       DATA PLANE
             │                                 │
       Next.js + API                    Telemetry SDK
             │                                 │
       PostgreSQL                      Ingestion API
             │                                 │
       Configuration                   Redis Streams
                                             │
                                             ▼
                                       Metric Workers
                                             │
                              ┌──────────────┼──────────────┐
                              │              │              │
                              ▼              ▼              ▼
                           Redis         ClickHouse       Alerts
                              │              │              │
                              └──────┬───────┘              │
                                     ▼                      ▼
                              WebSocket Gateway         Incidents
                                     │
                                     ▼
                              Next.js Dashboard
```

The central architectural rule is:

> **The monitored application must never depend on PulseTrace being healthy.**

If PulseTrace crashes, loses its database, or becomes overloaded, the customer's API should continue serving requests. PulseTrace may lose telemetry according to its configured durability policy, but it must not become a dependency of the application it monitors.
