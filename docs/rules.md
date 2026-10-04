# PulseTrace

# Engineering Rules & Development Standards

**Project:** PulseTrace
**Version:** 1.0.0
**Runtime:** Node.js
**Frontend:** Next.js
**Language:** TypeScript
**Package Manager:** pnpm
**Architecture:** Monorepo + Event-Driven Telemetry Pipeline

---

# 1. Core Engineering Rules

## Rule 1 — Do Not Block the Monitored Application

PulseTrace telemetry must never become a synchronous dependency of the application being monitored.

Never:

```text
Application Request
    ↓
Send telemetry
    ↓
Wait for PulseTrace
    ↓
Return response
```

Always:

```text
Application Request
    ↓
Application Response

Telemetry
    ↓
Background transmission
    ↓
PulseTrace
```

If PulseTrace is unavailable, the monitored application must continue operating.

---

# 2. Architecture Rules

## Rule 2 — Respect Service Boundaries

The following boundaries must be maintained:

```text
Next.js
    ↓
Node.js API
    ↓
Application Services
    ↓
Database / Redis / Stream
```

The frontend must never directly access:

```text
PostgreSQL
Redis
ClickHouse
Redis Streams
```

---

## Rule 3 — Control Plane and Data Plane Must Remain Separate

Control plane:

```text
Users
Projects
Services
API Keys
Alerts
Dashboards
Settings
```

Data plane:

```text
Telemetry
Metrics
Aggregation
Processing
Realtime streaming
```

Telemetry spikes must not block control-plane operations.

---

# 3. Monorepo Rules

## Rule 4 — Use pnpm Only

Dependency installation must use:

```bash
pnpm install
```

Adding packages:

```bash
pnpm add <package>
```

Adding development dependencies:

```bash
pnpm add -D <package>
```

Do not use:

```bash
npm install
yarn install
```

unless there is an explicit migration requirement.

---

## Rule 5 — Use pnpm Workspaces

The repository must use:

```text
pnpm-workspace.yaml
```

Applications belong under:

```text
apps/
```

Shared packages belong under:

```text
packages/
```

---

## Rule 6 — Shared Logic Must Become Packages

If functionality is used by multiple applications, it should not be duplicated.

Examples:

```text
packages/types
packages/config
packages/validation
packages/metrics
packages/database
```

---

# 4. TypeScript Rules

## Rule 7 — TypeScript Is Mandatory

Production code must use TypeScript.

Avoid:

```text
.js
```

for application logic unless there is a specific technical reason.

---

## Rule 8 — Avoid `any`

Do not use:

```ts
const data: any = ...
```

Prefer:

```ts
const data: TelemetryEvent = ...
```

If an external value is unknown:

```ts
unknown;
```

must be used and validated before access.

---

## Rule 9 — Validate External Data

Never trust:

```text
Request body
Query parameters
Headers
API keys
WebSocket messages
SDK payloads
Environment variables
```

Everything entering the system must be validated.

Use a schema validation layer.

---

# 5. API Rules

## Rule 10 — Version the API

All public APIs must use:

```text
/api/v1/
```

Example:

```text
/api/v1/projects
/api/v1/services
/api/v1/telemetry
/api/v1/metrics
```

Breaking API changes require a new version.

---

## Rule 11 — Use Consistent Response Formats

Success:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request."
  }
}
```

---

## Rule 12 — Every Request Gets a Request ID

Every API request should have:

```text
requestId
```

Example:

```text
X-Request-ID: req_123456
```

The ID must appear in:

```text
Logs
Errors
Tracing context
Internal diagnostics
```

---

# 6. HTTP Rules

## Rule 13 — Use Correct HTTP Status Codes

Examples:

```text
200 → Successful request
201 → Resource created
202 → Accepted for asynchronous processing
204 → Successful request with no content
400 → Invalid request
401 → Authentication required
403 → Permission denied
404 → Resource not found
409 → Conflict
422 → Validation failure
429 → Rate limit exceeded
500 → Internal server error
503 → Service unavailable
```

---

## Rule 14 — Telemetry Ingestion Should Be Asynchronous

Telemetry ingestion should normally return:

```text
202 Accepted
```

after the event has been successfully accepted into the ingestion pipeline.

Do not perform expensive metric processing before responding.

---

# 7. Telemetry Rules

## Rule 15 — Telemetry Must Have a Defined Schema

Every telemetry event must follow the canonical schema.

Example:

```json
{
  "timestamp": "2026-09-28T10:30:00Z",
  "projectId": "proj_123",
  "serviceId": "svc_123",
  "endpointId": "ep_123",
  "method": "GET",
  "statusCode": 200,
  "durationMs": 143,
  "requestBytes": 512,
  "responseBytes": 4096,
  "success": true
}
```

Unknown fields must not silently alter the canonical model.

---

## Rule 16 — Timestamp Rules

Telemetry timestamps must:

- Use UTC internally.
- Use ISO-8601 where human-readable timestamps are required.
- Be validated.
- Prevent unreasonable future timestamps.
- Support clock skew within a defined tolerance.

The platform must not silently mix local time zones with UTC.

---

## Rule 17 — Duration Must Be Numeric

Use:

```text
durationMs
```

as a numeric value.

Correct:

```json
{
  "durationMs": 143
}
```

Incorrect:

```json
{
  "duration": "143 milliseconds"
}
```

---

# 8. Telemetry Privacy Rules

## Rule 18 — Never Collect Secrets by Default

Never automatically store:

```text
Authorization
Cookie
Set-Cookie
Password
API Key
Secret
JWT
Session Token
Credit Card Number
Private Credentials
```

---

## Rule 19 — Request Bodies Are Disabled by Default

Do not capture complete request or response bodies unless explicitly enabled.

Even when enabled:

```text
Sensitive fields must be masked.
```

---

## Rule 20 — Never Log API Keys

Never write:

```text
API key
Bearer token
JWT
Database password
```

into application logs.

If debugging requires identifying a key:

```text
Use key ID
```

rather than the raw secret.

---

# 9. API Key Rules

## Rule 21 — API Keys Must Be Scoped

Every ingestion key must belong to a specific:

```text
Project
```

and preferably:

```text
Environment
```

---

## Rule 22 — API Keys Must Be Revocable

The platform must support:

```text
Create
Rotate
Revoke
Disable
```

---

## Rule 23 — Store Key Hashes

Where possible, store:

```text
Key ID
Key hash
Project ID
Environment
Created timestamp
Last used timestamp
```

Do not store raw secrets unnecessarily.

---

# 10. Authentication Rules

## Rule 24 — Dashboard Authentication and Telemetry Authentication Are Separate

Dashboard:

```text
User
 ↓
Session
 ↓
Dashboard
```

Telemetry:

```text
Application
 ↓
API Key
 ↓
Telemetry API
```

Do not use user sessions for machine telemetry.

---

# 11. Authorization Rules

## Rule 25 — Never Trust Client-Supplied Ownership

Never assume:

```text
projectId
serviceId
endpointId
```

belongs to the authenticated user.

Always verify:

```text
User
 ↓
Organization
 ↓
Project
 ↓
Service
 ↓
Endpoint
```

---

## Rule 26 — Authorization Must Happen Before Data Access

Bad:

```text
Query database
 ↓
Check ownership
```

Correct:

```text
Authenticate
 ↓
Authorize
 ↓
Query scoped data
```

---

# 12. Database Rules

## Rule 27 — PostgreSQL Stores Control-Plane Data

PostgreSQL should primarily contain:

```text
Users
Projects
Environments
Services
Endpoints
API Keys
Alert Rules
Incidents
Dashboards
Settings
```

---

## Rule 28 — Do Not Treat PostgreSQL as an Unlimited Telemetry Sink

Do not insert every high-frequency request indefinitely into PostgreSQL.

Bad architecture:

```text
100,000 requests/sec
       ↓
PostgreSQL row per request
       ↓
Forever
```

This will eventually become an operational problem.

---

## Rule 29 — Telemetry Storage Must Be Independent

Telemetry should eventually use:

```text
ClickHouse
```

or another dedicated analytical/time-series system.

---

# 13. Prisma Rules

## Rule 30 — Prisma Is for Application Data

Prisma should primarily manage:

```text
PostgreSQL
```

and control-plane entities.

Do not force extremely high-volume telemetry workloads through Prisma.

---

## Rule 31 — Database Queries Must Be Explicit

Avoid uncontrolled:

```ts
findMany();
```

on large datasets.

Always consider:

```text
Pagination
Filtering
Time ranges
Limits
Indexes
Aggregation
```

---

# 14. Query Rules

## Rule 32 — Every Telemetry Query Needs a Time Boundary

Never allow:

```text
SELECT * FROM telemetry;
```

for dashboard requests.

Queries should specify:

```text
startTime
endTime
```

---

## Rule 33 — Limit Returned Data

The API must never return unlimited telemetry.

Use:

```text
limit
cursor
aggregation
time buckets
```

---

# 15. Metrics Rules

## Rule 34 — Every Metric Must Have a Formal Definition

Do not create ambiguous metrics.

For example:

```text
Error Rate
```

must have a defined formula.

```text
errorRate =
failedRequests / totalRequests × 100
```

---

## Rule 35 — Average Latency Is Not Enough

Always support percentile latency:

```text
P50
P75
P90
P95
P99
```

Average latency must never be presented as the sole performance metric.

---

## Rule 36 — Percentiles Must Be Calculated Correctly

Do not estimate:

```text
P95 = average × 1.95
```

This is invalid.

Use proper percentile algorithms or approximate quantile structures.

---

# 16. Metric Naming Rules

Use consistent names.

Examples:

```text
request_count
request_rate
error_count
error_rate
latency_avg
latency_p50
latency_p95
latency_p99
throughput_bytes
availability
```

Do not mix:

```text
responseTime
response_time
responseTimeMs
```

without a documented reason.

---

# 17. Units Rules

Every metric must have an explicit unit.

Examples:

```text
Latency → milliseconds
CPU → percentage
Memory → bytes
Throughput → bytes/sec
Request rate → requests/sec
Error rate → percentage
```

Never return ambiguous values.

---

# 18. Aggregation Rules

Raw telemetry should be aggregated before being sent to the browser.

Example:

```text
Raw Events
   ↓
5-second bucket
   ↓
Metric Point
   ↓
Browser
```

Never stream thousands of raw events per second directly to the dashboard.

---

# 19. Real-Time Rules

## Rule 19 — WebSocket Is for Live Data

WebSocket should handle:

```text
Live metrics
Live alerts
Incident state
Service status
```

REST should handle:

```text
Historical metrics
Configuration
Projects
Services
Endpoints
```

---

## Rule 20 — WebSocket Connections Must Be Bounded

The server must monitor:

```text
Connection count
Connection duration
Subscriptions
Message rate
```

---

## Rule 21 — WebSocket Clients Must Reconnect

The client must support:

```text
Disconnect
 ↓
Backoff
 ↓
Reconnect
 ↓
Resubscribe
```

Do not assume permanent connectivity.

---

# 20. Redis Rules

## Rule 22 — Redis Is Not Permanent Storage

Redis should contain:

```text
Hot metrics
Realtime state
Streams
Pub/Sub
Rate limits
Temporary data
```

Historical data must be stored elsewhere.

---

## Rule 23 — Redis Memory Must Be Bounded

Every temporary key must have:

```text
TTL
```

unless there is an explicit reason not to.

---

# 21. Redis Streams Rules

## Rule 24 — Use Consumer Groups for Workers

Workers must consume telemetry using consumer groups.

```text
Stream
 ├── Worker 1
 ├── Worker 2
 └── Worker 3
```

---

## Rule 25 — Messages Must Be Acknowledged

Processed messages must be acknowledged.

Failed processing should enter a controlled retry path.

---

## Rule 26 — Failed Messages Must Not Loop Forever

Implement:

```text
Retry limit
Backoff
Dead-letter strategy
```

for repeatedly failing telemetry.

---

# 22. Worker Rules

## Rule 27 — Workers Must Be Stateless

Workers should store state in:

```text
Redis
Database
Stream
Analytics storage
```

not only in process memory.

---

## Rule 28 — Workers Must Be Horizontally Scalable

The system should support:

```text
Worker 1
Worker 2
Worker 3
Worker N
```

without changing telemetry semantics.

---

# 23. Backpressure Rules

## Rule 29 — Backpressure Must Be Explicit

When ingestion exceeds processing capacity:

```text
Queue grows
 ↓
Detect pressure
 ↓
Apply backpressure policy
```

Do not allow:

```text
Unlimited queue
Unlimited memory
Unlimited retries
```

---

## Rule 30 — Controlled Data Loss Is Better Than System Failure

If telemetry becomes temporarily unsustainable:

```text
Drop low-priority telemetry
```

rather than:

```text
Crash PulseTrace
```

or:

```text
Block monitored applications
```

---

# 24. Sampling Rules

## Rule 31 — Sampling Must Be Transparent

If telemetry is sampled:

```text
sampleRate
```

must be known to the metric processor.

Do not calculate full traffic metrics as if a 10% sample represented 100% without applying appropriate statistical treatment.

---

## Rule 32 — Errors Should Receive Higher Retention Priority

If sampling is enabled:

```text
Successful requests
→ sampled

Errors
→ retained at higher rate
```

The exact policy must be configurable.

---

# 25. SDK Rules

## Rule 33 — SDK Must Be Lightweight

The SDK should minimize:

```text
CPU usage
Memory usage
Network requests
Latency overhead
```

---

## Rule 34 — SDK Must Batch Events

Do not send one HTTP request to PulseTrace for every monitored request.

Bad:

```text
API request
 ↓
Telemetry HTTP request
```

Preferred:

```text
API requests
 ↓
Local batch
 ↓
Single telemetry request
```

---

## Rule 35 — SDK Must Have Bounded Buffers

Never allow:

```text
unlimited event queue
```

in application memory.

---

## Rule 36 — SDK Failures Must Be Silent to the Application

Telemetry failures should not throw uncaught exceptions into the monitored application.

---

# 26. Performance Rules

## Rule 37 — Dashboard Must Not Query Raw Data Unnecessarily

Use pre-aggregated metrics wherever possible.

---

## Rule 38 — Select Aggregation Resolution Dynamically

Example:

```text
5 minutes
→ 1-second points

1 hour
→ 10-second points

24 hours
→ 1-minute points

30 days
→ 1-hour points
```

The exact resolution can evolve based on implementation.

---

## Rule 39 — Never Return Millions of Points to the Browser

The browser should receive a reasonable number of visualization points.

Prefer:

```text
100–2,000 points
```

depending on graph type and screen size.

---

# 27. Next.js Rules

## Rule 40 — Next.js Is the Presentation Layer

Next.js should handle:

```text
UI
Routing
Server rendering where useful
Client interaction
Dashboard state
Authentication UI
```

Business logic belongs in the backend services.

---

## Rule 41 — Do Not Duplicate Backend Logic in Next.js

Do not implement:

```text
Metric calculations
Alert evaluation
API key validation
Telemetry processing
```

inside frontend code.

---

## Rule 42 — Server Components by Default

Use React Server Components where appropriate.

Use client components only when interactivity requires them.

---

# 28. Frontend State Rules

Use clear separation:

```text
Server state
→ API data

Realtime state
→ WebSocket data

UI state
→ Local component state
```

Do not put all application state into one global store.

---

# 29. Graph Rules

## Rule 43 — Graphs Must Represent Actual Data

Do not fabricate metrics for visual smoothness.

---

## Rule 44 — Clearly Distinguish Missing Data

The UI must differentiate:

```text
No requests
```

from:

```text
No telemetry
```

and:

```text
Telemetry unavailable
```

These are different states.

---

## Rule 45 — Graphs Must Handle Spikes

Do not automatically smooth away significant spikes.

Smoothing may hide actual incidents.

---

# 30. Alert Rules

## Rule 46 — Alerts Require Conditions and Duration

Bad:

```text
P95 > 500ms
→ immediately alert
```

Better:

```text
P95 > 500ms
for 5 consecutive minutes
→ alert
```

---

## Rule 47 — Prevent Alert Flapping

Implement:

```text
Trigger threshold
Recovery threshold
Evaluation window
Cooldown
```

where appropriate.

---

## Rule 48 — Alerts Must Be Idempotent

Repeated evaluations of the same condition must not create hundreds of duplicate incidents.

---

# 31. Incident Rules

An incident must have:

```text
id
alertRuleId
startedAt
acknowledgedAt
resolvedAt
status
affectedService
affectedEndpoint
```

---

# 32. Resource Monitoring Rules

Resource metrics must identify their source.

Example:

```text
CPU:
Node.js process CPU

Memory:
RSS

Heap:
V8 heap

Event Loop:
Node.js event-loop utilization
```

Do not label:

```text
Process CPU
```

as:

```text
Server CPU
```

unless the metric actually represents the whole server.

---

# 33. Security Rules

## Rule 49 — TLS Everywhere in Production

Production communication must use:

```text
HTTPS
WSS
```

Never transmit API keys through plaintext HTTP in production.

---

## Rule 50 — Database Ports Must Not Be Public

PostgreSQL, Redis, and analytics databases should be accessible only from trusted network boundaries.

---

## Rule 51 — Secrets Must Use Environment/Secret Management

Never commit:

```text
.env
API keys
Database passwords
JWT secrets
Private certificates
```

to Git.

---

# 34. Logging Rules

## Rule 52 — Use Structured Logging

Preferred:

```json
{
  "level": "info",
  "service": "telemetry-worker",
  "requestId": "req_123",
  "message": "Batch processed"
}
```

Avoid uncontrolled:

```ts
console.log("something happened");
```

in production code.

---

## Rule 53 — Never Log Sensitive Payloads

Never log:

```text
Authorization
Cookies
Passwords
Tokens
Request bodies containing secrets
API keys
```

---

# 35. Error Handling Rules

## Rule 54 — Errors Must Have Stable Codes

Example:

```text
INVALID_API_KEY
PROJECT_NOT_FOUND
SERVICE_NOT_FOUND
RATE_LIMITED
TELEMETRY_INVALID
INTERNAL_ERROR
```

---

## Rule 55 — Do Not Leak Internal Errors

Never return:

```text
Database stack trace
Redis connection details
File paths
Environment variables
Internal service topology
```

to clients.

---

# 36. Retry Rules

## Rule 56 — Retries Require Backoff

Use:

```text
Exponential backoff
```

where appropriate.

Never:

```text
while failure:
    retry()
```

without limits.

---

## Rule 57 — Retries Must Have a Maximum

Every retryable operation must define:

```text
Maximum attempts
Maximum delay
Failure behavior
```

---

# 37. Database Performance Rules

## Rule 58 — Index Frequently Queried Fields

Likely indexes include:

```text
projectId
serviceId
endpointId
timestamp
statusCode
```

Indexes must be justified by actual query patterns.

---

## Rule 59 — Avoid N+1 Queries

Use:

```text
Joins
Batch queries
Explicit includes
Data loaders
```

where appropriate.

---

# 38. Retention Rules

Initial targets:

```text
Raw telemetry:
7 days

Aggregated metrics:
30 days

Daily aggregates:
1 year
```

These are configuration defaults, not hard-coded assumptions.

---

# 39. Data Deletion Rules

When deleting a project:

```text
Project metadata
API keys
Services
Endpoints
Alert rules
Incidents
Telemetry
```

must follow a defined deletion/retention policy.

Do not leave orphaned telemetry indefinitely.

---

# 40. Multi-Tenant Rules

Every tenant-owned entity must have an ownership path.

Example:

```text
Organization
 ↓
Project
 ↓
Service
 ↓
Endpoint
 ↓
Metric
```

Queries must always include tenant/project scope.

---

# 41. Environment Rules

Every service must identify its environment:

```text
development
staging
production
```

Metrics from different environments must not be silently merged.

---

# 42. Naming Rules

Use:

```text
camelCase
```

for TypeScript variables.

Use:

```text
PascalCase
```

for classes/types/components.

Use:

```text
kebab-case
```

for route/file naming where appropriate.

Examples:

```text
metric-service.ts
TelemetryProcessor
MetricBucket
```

---

# 43. Git Rules

Branches:

```text
main
develop
feature/*
fix/*
refactor/*
```

Commit messages should describe the change.

Example:

```text
feat: add telemetry ingestion endpoint
fix: prevent duplicate alert incidents
refactor: separate metric processing worker
```

---

# 44. Pull Request Rules

Every PR should verify:

```text
TypeScript compilation
Lint
Unit tests
Integration tests
Build
Database migration
Security implications
Performance implications
```

---

# 45. Testing Rules

## Unit Tests

Test:

```text
Metric calculations
Percentiles
Error rate
Throughput
Alert conditions
Data masking
Validation
```

---

## Integration Tests

Test:

```text
API
PostgreSQL
Redis
Telemetry ingestion
Workers
```

---

## End-to-End Tests

Test:

```text
Application
 ↓
SDK
 ↓
PulseTrace
 ↓
Dashboard
```

---

# 46. Load Testing Rules

Before claiming scalability, test actual throughput.

Minimum benchmark targets:

```text
1,000 events/sec
5,000 events/sec
10,000 events/sec
```

Higher levels should be tested before production scaling claims.

Measure:

```text
CPU
Memory
Latency
Queue depth
Dropped events
Worker throughput
Database writes
```

---

# 47. Observability Rules

PulseTrace must monitor itself.

Required internal metrics:

```text
ingestion_requests
ingestion_errors
ingestion_latency
telemetry_events_received
telemetry_events_processed
telemetry_events_dropped
queue_depth
worker_processing_latency
redis_latency
database_latency
websocket_connections
alert_evaluations
```

---

# 48. Health Checks

Every service must expose:

```text
/health
```

and where appropriate:

```text
/ready
```

Health must distinguish:

```text
Process alive
```

from:

```text
Dependencies ready
```

---

# 49. Deployment Rules

Local development:

```text
Docker Compose
```

Production:

```text
Containerized services
```

Each independently scalable service should be deployable separately.

---

# 50. Docker Rules

Containers should:

- Run as non-root where practical.
- Have health checks.
- Use pinned base images.
- Avoid unnecessary packages.
- Have predictable startup behavior.
- Receive configuration through environment variables.

---

# 51. Resource Limits

Production containers should define:

```text
CPU limits
Memory limits
Restart policy
Health checks
```

The system must be tested under resource pressure.

---

# 52. Dependency Rules

Do not add dependencies simply because they are popular.

Before adding a package, evaluate:

```text
Maintenance
Bundle size
Security
Performance
License
Complexity
Actual necessity
```

Avoid unnecessary frameworks.

---

# 53. Architecture Anti-Patterns

The following are prohibited.

## Anti-Pattern 1

```text
Next.js
 ↓
Direct PostgreSQL access
```

---

## Anti-Pattern 2

```text
Every API request
 ↓
Synchronous telemetry request
```

---

## Anti-Pattern 3

```text
All telemetry
 ↓
PostgreSQL forever
```

---

## Anti-Pattern 4

```text
Every raw event
 ↓
WebSocket
 ↓
Browser
```

---

## Anti-Pattern 5

```text
Worker
 ↓
Global in-memory state
```

---

## Anti-Pattern 6

```text
Infinite retries
```

---

## Anti-Pattern 7

```text
Unlimited Redis memory
```

---

## Anti-Pattern 8

```text
Unbounded dashboard queries
```

---

# 54. Performance Budget

PulseTrace should target:

```text
Dashboard initial load:
< 2 seconds

Normal API query:
< 300ms

Live metric propagation:
< 1 second

Telemetry ingestion:
Low single-digit milliseconds of processing overhead
```

These are engineering targets and must be validated through benchmarking.

---

# 55. Data Correctness Rules

## Rule 53 — Never Mix Sampling With Full Counts

If 10% sampling is used, the system must know that the underlying data is sampled.

---

## Rule 54 — Never Treat Missing Data as Zero

Example:

```text
No telemetry
```

does not mean:

```text
0 requests
```

---

## Rule 55 — Preserve Metric Provenance

Metrics should be traceable to:

```text
Project
Service
Endpoint
Environment
Time range
Aggregation
Sampling configuration
```

---

# 56. Time-Series Rules

All time-series operations must use UTC internally.

Bucket boundaries must be deterministic.

Example:

```text
2026-09-28T10:00:00Z
2026-09-28T10:00:05Z
2026-09-28T10:00:10Z
```

Avoid server-local time for metric aggregation.

---

# 57. Clock Skew

Telemetry producers may have inaccurate clocks.

The ingestion pipeline should:

```text
Validate timestamp
Detect extreme skew
Record ingestion timestamp
Preserve event timestamp
```

Never silently overwrite event time without preserving ingestion time.

---

# 58. Two Timestamps

Telemetry should preferably contain:

```text
eventTimestamp
ingestedAt
```

Example:

```json
{
  "eventTimestamp": "2026-09-28T10:30:00Z",
  "ingestedAt": "2026-09-28T10:30:00.120Z"
}
```

This allows ingestion delay to be measured.

---

# 59. Deployment Safety

Production deployments must support:

```text
Health checks
Graceful shutdown
Connection draining
Worker shutdown
Queue acknowledgement
Database migration safety
```

---

# 60. Graceful Shutdown

On shutdown:

```text
Stop accepting new work
        ↓
Finish current requests
        ↓
Stop consuming new telemetry
        ↓
Finish/acknowledge safe work
        ↓
Close Redis
        ↓
Close database
        ↓
Exit
```

Do not terminate workers abruptly if avoidable.

---

# 61. Configuration Rules

Configuration should be centralized.

Example:

```text
packages/config
```

It should validate:

```text
DATABASE_URL
REDIS_URL
API_KEY_SECRET
SESSION_SECRET
WEBSOCKET configuration
ANALYTICS_DB configuration
```

Application startup should fail fast when required configuration is missing.

---

# 62. Documentation Rules

Every major subsystem must have documentation.

Required:

```text
README.md
PRD.md
architecture.md
rules.md
telemetry-spec.md
metrics-spec.md
```

---

# 63. Telemetry Specification Rule

The telemetry schema must be treated as a contract.

Changing:

```text
field name
field type
required field
semantic meaning
```

requires updating:

```text
SDK
Validation
Workers
Storage
API
Documentation
Tests
```

---

# 64. Backward Compatibility

SDK versions should remain compatible with supported ingestion API versions.

Breaking telemetry changes require:

```text
Versioning
Migration strategy
Documentation
```

---

# 65. Feature Flags

Experimental features should use feature flags.

Examples:

```text
CLICKHOUSE_ENABLED
SAMPLING_ENABLED
TRACING_ENABLED
ANOMALY_DETECTION_ENABLED
```

Do not hide experimental behavior behind undocumented environment variables.

---

# 66. Development Environment

Recommended local stack:

```text
Docker
├── PostgreSQL
├── Redis
└── Optional ClickHouse
```

Application processes:

```text
pnpm dev
```

should run:

```text
Next.js
API
Worker
```

---

# 67. Production Principle

Do not prematurely introduce:

```text
Kafka
Kubernetes
Multiple databases
Multiple regions
ML anomaly detection
Distributed tracing
```

unless the current architecture has demonstrated a real requirement.

Complexity is not scalability.

---

# 68. Scalability Principle

The architecture must be:

```text
Simple initially
Modular internally
Scalable where necessary
```

The goal is not to deploy ten infrastructure components for a system handling ten requests per second.

---

# 69. Monitoring the Monitoring System

PulseTrace must expose its own operational dashboard.

Minimum internal dashboard:

```text
PulseTrace Health

Ingestion RPS
Processing RPS
Queue Depth
Dropped Events
Worker Latency
API Latency
Database Latency
Redis Latency
WebSocket Connections
Active Alerts
```

---

# 70. Definition of Done

A feature is not complete until:

```text
Implementation
    ↓
Types
    ↓
Validation
    ↓
Tests
    ↓
Logging
    ↓
Metrics
    ↓
Security review
    ↓
Documentation
```

are addressed where applicable.

---

# 71. Final Non-Negotiable Rules

The following rules override convenience:

```text
1. Never block a monitored application because PulseTrace is unavailable.

2. Never expose secrets through telemetry.

3. Never trust client-supplied ownership information.

4. Never allow unbounded telemetry storage.

5. Never stream unlimited raw telemetry to browsers.

6. Never treat missing telemetry as zero traffic.

7. Never calculate percentiles using invalid shortcuts.

8. Never allow infinite retries.

9. Never allow unlimited in-memory buffering.

10. Never make PostgreSQL the permanent high-volume telemetry sink.

11. Never introduce infrastructure complexity without a measured requirement.

12. PulseTrace must monitor itself.

13. All production telemetry must use UTC internally.

14. Every metric must have a documented definition and unit.

15. Every external input must be validated.

16. Every tenant-owned resource must be authorization-scoped.

17. Realtime functionality must degrade gracefully.

18. Historical analytics and realtime state must remain separate.

19. SDK telemetry failures must not crash the monitored application.

20. Performance claims must be backed by load testing.
```

---

# 72. Engineering Philosophy

PulseTrace should follow this hierarchy:

```text
Correctness
     ↓
Security
     ↓
Reliability
     ↓
Performance
     ↓
Scalability
     ↓
Convenience
```

Do not sacrifice correctness for a prettier dashboard.

Do not sacrifice security for easier telemetry collection.

Do not sacrifice reliability for theoretical scalability.

Do not introduce distributed infrastructure before the measured workload requires it.

The core objective is:

> **Build the smallest observability system that can collect trustworthy telemetry, process it correctly, display it in real time, and scale its data plane independently when actual traffic demands it.**
