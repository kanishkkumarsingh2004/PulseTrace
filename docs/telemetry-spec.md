# PulseTrace Telemetry Specification

**Version:** 1.0
**Status:** Draft
**Project:** PulseTrace
**Protocol:** HTTPS / JSON
**Primary Ingestion Endpoint:** `POST /api/v1/telemetry`

---

## 1. Purpose

This document defines the canonical telemetry contract used by PulseTrace to collect API performance and operational metrics.

Telemetry represents an observation of an API request handled by a monitored service.

PulseTrace telemetry is designed to capture:

- Request latency
- Response status
- Throughput
- Error rate
- Request/response size
- Endpoint information
- Service information
- Runtime/resource information
- Deployment/environment information
- Trace/request correlation identifiers
- Timing information
- Optional metadata

The telemetry system MUST be:

- Non-blocking for monitored applications
- Bounded in memory
- Validated at ingestion
- Versioned
- Tenant-isolated
- Privacy-conscious
- Resilient to temporary PulseTrace failures

---

# 2. Design Principles

## 2.1 Telemetry Must Never Block the Application

The monitored application MUST NOT depend on PulseTrace availability.

If telemetry ingestion fails:

```text
Application Request
       |
       +----> Application Response
       |
       +----> Telemetry Buffer
                    |
                    +----> PulseTrace
```

Failure of PulseTrace MUST NOT cause the original API request to fail.

---

## 2.2 Telemetry Is Eventually Processed

Telemetry does not need to be processed synchronously.

The preferred flow is:

```text
SDK
 |
 | HTTPS
 v
Telemetry API
 |
 v
Validation
 |
 v
Normalization
 |
 v
Redis Stream
 |
 v
Worker
 |
 +----> Aggregation
 |
 +----> Alert Evaluation
 |
 +----> Historical Storage
 |
 +----> Realtime Publisher
```

---

## 2.3 Control Plane and Telemetry Plane Are Separate

Control-plane data:

- Users
- Organizations
- Projects
- Services
- Environments
- API keys
- Alert configurations

MUST NOT be mixed with high-volume telemetry storage.

PostgreSQL is primarily a control-plane database.

Telemetry storage is designed separately for high-volume workloads.

---

# 3. Telemetry Event

The canonical telemetry event is:

```json
{
  "schemaVersion": "1.0",
  "eventId": "01JABC123XYZ",
  "timestamp": "2026-09-28T08:30:21.421Z",
  "ingestedAt": "2026-09-28T08:30:21.530Z",

  "projectId": "proj_123",
  "environmentId": "env_prod",
  "serviceId": "svc_api",
  "endpointId": "ep_users",

  "service": {
    "name": "user-api",
    "version": "1.8.2",
    "instanceId": "api-01",
    "region": "ap-south-1"
  },

  "request": {
    "method": "GET",
    "route": "/api/users/:id",
    "path": "/api/users/123",
    "protocol": "HTTP/1.1"
  },

  "response": {
    "statusCode": 200,
    "success": true
  },

  "performance": {
    "durationMs": 124.72,
    "networkDurationMs": 8.21,
    "serverDurationMs": 116.51
  },

  "traffic": {
    "requestBytes": 482,
    "responseBytes": 4210
  },

  "correlation": {
    "requestId": "req_abc123",
    "traceId": "trace_xyz",
    "spanId": "span_123"
  }
}
```

---

# 4. Required Fields

The following fields are mandatory.

| Field                    | Type     | Description                       |
| ------------------------ | -------- | --------------------------------- |
| `schemaVersion`          | string   | Telemetry schema version          |
| `eventId`                | string   | Unique telemetry event identifier |
| `timestamp`              | ISO-8601 | Original event timestamp          |
| `projectId`              | string   | PulseTrace project                |
| `serviceId`              | string   | Monitored service                 |
| `request.method`         | string   | HTTP method                       |
| `request.route`          | string   | Normalized route                  |
| `response.statusCode`    | integer  | HTTP status                       |
| `performance.durationMs` | number   | Total request duration            |

---

# 5. Event Identity

Every telemetry event MUST contain a unique:

```text
eventId
```

Example:

```text
01JABC123XYZ789
```

UUIDs may also be used:

```text
550e8400-e29b-41d4-a716-446655440000
```

The recommended format for high-volume systems is a sortable ID such as ULID.

---

# 6. Timestamp Requirements

Telemetry MUST contain the original event timestamp.

Example:

```json
{
  "timestamp": "2026-09-28T08:30:21.421Z"
}
```

PulseTrace MUST also record ingestion time internally:

```json
{
  "ingestedAt": "2026-09-28T08:30:21.530Z"
}
```

These timestamps have different meanings.

### `timestamp`

When the monitored request actually occurred.

### `ingestedAt`

When PulseTrace received the telemetry.

This difference allows PulseTrace to detect:

```text
Telemetry Delay =
ingestedAt - timestamp
```

---

# 7. Clock Requirements

All timestamps MUST use UTC.

Accepted:

```text
2026-09-28T08:30:21.421Z
```

Avoid:

```text
28/09/2026 14:00
```

Avoid storing timezone-dependent timestamps.

---

# 8. Request Specification

## 8.1 HTTP Method

Supported methods:

```text
GET
POST
PUT
PATCH
DELETE
HEAD
OPTIONS
CONNECT
TRACE
```

Example:

```json
{
  "method": "POST"
}
```

---

# 9. Route Normalization

PulseTrace MUST prefer normalized routes instead of raw URLs.

Correct:

```text
/api/users/:id
```

Incorrect:

```text
/api/users/839291
```

Without normalization, one endpoint can incorrectly become thousands of separate metrics.

Example:

```text
/api/users/1
/api/users/2
/api/users/3
```

MUST become:

```text
/api/users/:id
```

---

# 10. Query Parameters

Query parameters MUST NOT be included in the canonical route.

Example request:

```text
/api/products?category=laptop&page=4
```

Canonical route:

```text
/api/products
```

Query parameters MUST NOT be stored by default.

If query telemetry is explicitly enabled, sensitive fields MUST be masked.

---

# 11. Request Metadata

Optional request metadata:

```json
{
  "request": {
    "method": "GET",
    "route": "/api/users/:id",
    "protocol": "HTTP/1.1",
    "userAgent": "Mozilla/5.0",
    "contentType": "application/json"
  }
}
```

User-Agent collection SHOULD be configurable.

---

# 12. Response Specification

Example:

```json
{
  "response": {
    "statusCode": 200,
    "success": true
  }
}
```

Status code MUST be an integer between:

```text
100–599
```

---

# 13. Success Definition

PulseTrace MUST NOT assume that every `2xx` response represents business success.

At the HTTP layer:

```text
2xx → success
3xx → redirect
4xx → client error
5xx → server error
```

However, business-level success may require custom instrumentation.

Example:

```json
{
  "response": {
    "statusCode": 200,
    "success": true
  },
  "business": {
    "success": false,
    "errorCode": "PAYMENT_DECLINED"
  }
}
```

Business telemetry SHOULD remain optional.

---

# 14. Latency Specification

The primary latency metric is:

```text
durationMs
```

Example:

```json
{
  "performance": {
    "durationMs": 124.72
  }
}
```

The value MUST be numeric.

Unit:

```text
milliseconds
```

Never send:

```text
"124ms"
```

Send:

```text
124
```

---

# 15. Timing Components

Where available, telemetry MAY contain:

```json
{
  "performance": {
    "durationMs": 124.72,
    "dnsDurationMs": 2.1,
    "tcpDurationMs": 3.21,
    "tlsDurationMs": 4.1,
    "networkDurationMs": 8.21,
    "serverDurationMs": 116.51
  }
}
```

These values MUST NOT be added together unless their measurement boundaries guarantee that they are non-overlapping.

---

# 16. Latency Precision

PulseTrace SHOULD preserve sub-millisecond precision where available.

Example:

```text
124.72 ms
```

Do not unnecessarily convert:

```text
124.72 → 125
```

during ingestion.

Rounding MAY happen at presentation time.

---

# 17. Traffic Metrics

Telemetry MAY contain:

```json
{
  "traffic": {
    "requestBytes": 482,
    "responseBytes": 4210
  }
}
```

Units:

```text
bytes
```

Values MUST be non-negative.

---

# 18. Throughput

Throughput is calculated from telemetry rather than directly trusted from an SDK-provided field.

For a time interval:

```text
Throughput =
Number of requests / interval
```

Example:

```text
600 requests / 60 seconds
= 10 requests/sec
```

PulseTrace SHOULD expose:

```text
Requests/sec
Requests/min
Requests/hour
```

depending on dashboard resolution.

---

# 19. Error Metrics

Error rate is calculated as:

```text
Error Rate =
Error Requests / Total Requests × 100
```

HTTP-level errors may be defined as:

```text
statusCode >= 400
```

PulseTrace SHOULD separately expose:

```text
4xx Rate
5xx Rate
```

Example:

```text
Total requests = 10,000
5xx requests = 120

5xx rate = 1.2%
```

---

# 20. Latency Percentiles

PulseTrace MUST support percentile calculations.

Minimum target:

```text
P50
P75
P90
P95
P99
```

Example:

```json
{
  "latency": {
    "p50": 82.1,
    "p95": 210.4,
    "p99": 481.7
  }
}
```

Percentiles MUST be calculated using a defined and consistent algorithm.

The system MUST NOT approximate percentiles using:

```text
average latency
```

---

# 21. Average Latency

Average latency:

```text
Average =
Σ duration / request count
```

Example:

```json
{
  "latency": {
    "avg": 128.42
  }
}
```

Average latency MUST NOT replace percentile latency.

Both provide different information.

---

# 22. Minimum/Maximum Latency

Aggregates SHOULD include:

```json
{
  "latency": {
    "min": 12.4,
    "max": 1201.7
  }
}
```

These metrics help identify spikes.

---

# 23. Resource Telemetry

Resource telemetry MAY be attached to request events.

Supported metrics:

```text
CPU
Memory RSS
V8 Heap
Event Loop Utilization
Network
Open Handles
```

Example:

```json
{
  "resources": {
    "cpuPercent": 48.2,
    "memoryRssBytes": 384000000,
    "heapUsedBytes": 142000000,
    "heapTotalBytes": 210000000,
    "eventLoopUtilization": 0.72
  }
}
```

---

# 24. CPU Semantics

CPU measurements MUST explicitly define what they represent.

For process-level CPU:

```text
process CPU %
```

For host-level CPU:

```text
host CPU %
```

These MUST NOT be silently mixed.

---

# 25. Memory Semantics

Memory values MUST identify their unit.

PulseTrace SHOULD use bytes internally.

Example:

```json
{
  "memoryRssBytes": 384000000
}
```

Dashboard presentation MAY convert:

```text
384 MB
```

---

# 26. Node.js Runtime Telemetry

For Node.js services, the SDK MAY capture:

```json
{
  "runtime": {
    "name": "node",
    "version": "24.x",
    "heapUsedBytes": 142000000,
    "heapTotalBytes": 210000000,
    "externalBytes": 21000000,
    "arrayBuffersBytes": 50000000000,
    "eventLoopUtilization": 0.72
  }
}
```

Runtime-specific fields MUST remain optional.

---

# 27. Service Metadata

Example:

```json
{
  "service": {
    "name": "user-api",
    "version": "1.8.2",
    "instanceId": "api-01",
    "region": "ap-south-1"
  }
}
```

Recommended fields:

```text
name
version
instanceId
region
zone
runtime
runtimeVersion
deploymentId
```

---

# 28. Environment

Every telemetry event SHOULD belong to an environment.

Examples:

```text
development
staging
production
```

Example:

```json
{
  "environmentId": "env_prod"
}
```

Production and development telemetry MUST never be mixed in dashboards or aggregations unless explicitly requested.

---

# 29. Correlation

Telemetry SHOULD support correlation identifiers.

```json
{
  "correlation": {
    "requestId": "req_123",
    "traceId": "trace_456",
    "spanId": "span_789"
  }
}
```

These identifiers allow:

```text
Request
   ↓
Service
   ↓
Database
   ↓
External API
```

to be correlated later.

---

# 30. Distributed Tracing Compatibility

PulseTrace telemetry SHOULD remain compatible with distributed tracing concepts.

The initial implementation does NOT need to implement a complete tracing system.

Recommended fields:

```text
traceId
spanId
parentSpanId
```

Future versions MAY support full distributed tracing.

---

# 31. Tags

Telemetry MAY contain controlled tags.

Example:

```json
{
  "tags": {
    "team": "payments",
    "region": "ap-south-1",
    "version": "1.8.2"
  }
}
```

Tag values MUST have limits.

Recommended limits:

```text
Maximum tags/event: 20
Maximum key length: 64
Maximum value length: 128
```

Arbitrary unbounded metadata MUST NOT be accepted.

---

# 32. Custom Metadata

Custom metadata MAY be supported:

```json
{
  "metadata": {
    "deployment": "blue",
    "release": "2026.09.28"
  }
}
```

Limits MUST be enforced.

Recommended:

```text
Maximum metadata keys: 20
Maximum serialized metadata: 4 KB
```

---

# 33. Sensitive Data

PulseTrace MUST NOT collect secrets by default.

The following MUST be considered sensitive:

```text
Authorization
Cookie
Set-Cookie
X-API-Key
API keys
JWT tokens
Passwords
Access tokens
Refresh tokens
Session tokens
Private keys
Database credentials
Credit card information
```

---

# 34. Request Headers

Request headers MUST NOT be captured wholesale.

If header collection is enabled, PulseTrace MUST use an allowlist.

Example:

```json
{
  "headers": {
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0"
  }
}
```

Sensitive headers MUST always be removed.

---

# 35. Request Bodies

Request bodies MUST be disabled by default.

PulseTrace SHOULD NOT store:

```text
passwords
payment information
authentication data
personal secrets
```

If body capture is implemented later, it MUST require explicit configuration and size limits.

---

# 36. Response Bodies

Response bodies MUST be disabled by default.

PulseTrace primarily needs:

```text
status
size
latency
headers where allowed
```

rather than the complete response.

---

# 37. IP Addresses

IP collection SHOULD be configurable.

If collected, the project privacy configuration MUST define:

```text
retain full IP
truncate IP
hash IP
do not collect IP
```

IP addresses MUST NOT become accidental high-cardinality metric labels.

---

# 38. High Cardinality Protection

The following values MUST NOT automatically become metric dimensions:

```text
userId
requestId
sessionId
transactionId
email
UUID
IP address
raw URL
query parameter
```

For example:

Incorrect:

```text
/api/users/123
/api/users/124
/api/users/125
```

Correct:

```text
/api/users/:id
```

---

# 39. Batch Telemetry

SDKs SHOULD batch events.

Example:

```json
{
  "schemaVersion": "1.0",
  "events": [
    {
      "eventId": "evt_001",
      "timestamp": "2026-09-28T08:30:21.421Z"
    },
    {
      "eventId": "evt_002",
      "timestamp": "2026-09-28T08:30:22.421Z"
    }
  ]
}
```

Recommended initial batch limits:

```text
Maximum events: 100
Maximum payload: 1 MB
```

These limits MUST be configurable server-side.

---

# 40. Ingestion API

Primary endpoint:

```http
POST /api/v1/telemetry
```

Headers:

```http
Content-Type: application/json
Authorization: Bearer <PULSETRACE_API_KEY>
```

Recommended:

```http
Content-Encoding: gzip
```

for sufficiently large payloads.

---

# 41. Successful Ingestion

The telemetry endpoint SHOULD return:

```http
202 Accepted
```

Example:

```json
{
  "success": true,
  "accepted": 100,
  "rejected": 0,
  "requestId": "req_ingestion_123"
}
```

`202 Accepted` means:

```text
Telemetry accepted for asynchronous processing.
```

It does NOT mean:

```text
Telemetry has already been aggregated and stored.
```

---

# 42. Partial Acceptance

A batch MAY contain invalid events.

Example:

```json
{
  "success": true,
  "accepted": 97,
  "rejected": 3,
  "errors": [
    {
      "index": 12,
      "code": "INVALID_DURATION"
    },
    {
      "index": 41,
      "code": "INVALID_TIMESTAMP"
    },
    {
      "index": 76,
      "code": "PAYLOAD_TOO_LARGE"
    }
  ]
}
```

The API SHOULD avoid rejecting an entire batch because of one malformed event.

---

# 43. Validation

Validation MUST occur at ingestion.

Validation includes:

```text
schema validation
type validation
range validation
tenant validation
project validation
API key validation
payload size validation
timestamp validation
cardinality validation
```

Invalid telemetry MUST NOT enter the processing stream.

---

# 44. Timestamp Validation

The ingestion service SHOULD reject events that are excessively old or far in the future.

Example initial policy:

```text
Maximum historical event age: 24 hours
Maximum future clock drift: 5 minutes
```

These values SHOULD be configurable.

---

# 45. Authentication

Telemetry ingestion MUST use a project/service API key.

Example:

```http
Authorization: Bearer pt_live_xxxxxxxxx
```

API keys MUST:

- Be generated securely
- Be revocable
- Be scoped
- Never be logged
- Never be returned after creation in plaintext
- Be rotatable

---

# 46. API Key Scope

Keys SHOULD be scoped to:

```text
Organization
Project
Environment
Service
```

Example:

```text
Project A
 ├── Production
 │    ├── API
 │    └── Worker
 │
 └── Staging
      └── API
```

A production API key MUST NOT automatically access staging telemetry.

---

# 47. Idempotency

Telemetry ingestion SHOULD be idempotent where practical.

`eventId` is the primary deduplication identifier.

If:

```text
eventId = evt_123
```

is received twice, PulseTrace SHOULD avoid counting it twice.

Deduplication MAY be implemented using:

```text
Redis
storage-level uniqueness
short-lived event cache
```

depending on scale.

---

# 48. Ordering

PulseTrace MUST NOT depend on telemetry arrival order.

Example:

```text
Event A timestamp: 10:01:02
Event B timestamp: 10:01:01
```

B may arrive after A.

Workers MUST process events based on their event timestamps where aggregation requires temporal ordering.

---

# 49. Late Events

Late telemetry MUST be handled explicitly.

Example:

```text
10:00 bucket created
10:01 event arrives
10:00 event arrives later
```

The aggregation system SHOULD support a configurable late-arrival window.

---

# 50. Telemetry Queue

Initial queue:

```text
Redis Streams
```

Example conceptual stream:

```text
pulsetrace:telemetry
```

Consumer group:

```text
telemetry-workers
```

Flow:

```text
Telemetry API
      |
      v
Redis Stream
      |
      +---- Worker 1
      +---- Worker 2
      +---- Worker 3
```

---

# 51. Queue Guarantees

The system SHOULD provide:

```text
at-least-once processing
```

Workers MUST therefore be designed to tolerate duplicate events.

Exactly-once processing MUST NOT be assumed.

---

# 52. Retry Policy

Transient processing failures SHOULD be retried.

Example:

```text
Attempt 1
   ↓
1 second
   ↓
Attempt 2
   ↓
5 seconds
   ↓
Attempt 3
   ↓
Dead Letter Queue
```

Retries MUST be bounded.

Infinite retries are prohibited.

---

# 53. Dead Letter Queue

Invalid or repeatedly failing telemetry SHOULD enter:

```text
Dead Letter Queue
```

Example:

```text
pulsetrace:telemetry:dead-letter
```

DLQ records SHOULD contain:

```text
eventId
failure reason
attempt count
original timestamp
failed stage
```

---

# 54. Backpressure

When PulseTrace cannot process telemetry fast enough:

```text
SDK
 ↓
bounded buffer
 ↓
batching
 ↓
ingestion
 ↓
queue
 ↓
workers
```

must remain bounded.

The system MUST NOT allow:

```text
unlimited SDK memory
unlimited Redis growth
unlimited worker queues
```

---

# 55. Telemetry Dropping

When capacity is exhausted, controlled telemetry loss is preferable to:

```text
application crashes
memory exhaustion
infinite queue growth
```

Priority SHOULD be:

```text
Errors
Critical alerts
Normal requests
Low-priority diagnostic metadata
```

Sampling/drop decisions MUST be observable.

---

# 56. Sampling

Sampling MAY be introduced for high-volume telemetry.

Example:

```text
Normal requests: 10%
Errors: 100%
Slow requests: 100%
```

Sampling configuration MUST be visible to the user.

Dashboard metrics MUST clearly indicate when data is sampled.

---

# 57. Error Preservation

Telemetry containing:

```text
statusCode >= 500
```

SHOULD receive higher retention priority.

Similarly, requests exceeding a configured latency threshold SHOULD receive higher priority.

---

# 58. Slow Request Detection

Example configuration:

```json
{
  "slowRequestThresholdMs": 1000
}
```

Any request:

```text
durationMs >= 1000
```

MAY be classified as slow.

Example:

```json
{
  "classification": {
    "slow": true
  }
}
```

---

# 59. Error Classification

Telemetry SHOULD support:

```text
success
client_error
server_error
network_error
timeout
cancelled
unknown
```

Example:

```json
{
  "classification": {
    "type": "server_error"
  }
}
```

---

# 60. Timeout Telemetry

Timeout events MAY contain:

```json
{
  "classification": {
    "type": "timeout"
  },
  "performance": {
    "durationMs": 50000000
  }
}
```

A timeout SHOULD remain distinguishable from a normal `5xx`.

---

# 61. Network Error Telemetry

If no HTTP response exists:

```json
{
  "response": {
    "statusCode": null,
    "success": false
  },
  "classification": {
    "type": "network_error"
  }
}
```

This allows PulseTrace to distinguish:

```text
HTTP 500
```

from:

```text
Connection refused
DNS failure
Socket timeout
```

---

# 62. Metric Aggregation

Workers SHOULD transform raw telemetry into time-series aggregates.

Example bucket:

```text
2026-09-28 08:30:00 → 08:31:00
```

Aggregate:

```json
{
  "requestCount": 1520,
  "errorCount": 31,
  "serverErrorCount": 12,
  "clientErrorCount": 19,

  "latency": {
    "min": 11.2,
    "max": 1421.8,
    "avg": 143.4,
    "p50": 104.2,
    "p95": 301.2,
    "p99": 671.4
  },

  "traffic": {
    "requestBytes": 820000,
    "responseBytes": 6200000
  }
}
```

---

# 63. Aggregation Dimensions

Initial dimensions:

```text
project
environment
service
endpoint
HTTP method
status class
```

Optional dimensions:

```text
region
deployment
version
```

High-cardinality dimensions MUST be rejected or explicitly controlled.

---

# 64. Time Buckets

Recommended aggregation levels:

```text
10 seconds
1 minute
5 minutes
1 hour
1 day
```

The dashboard SHOULD select an appropriate resolution based on the requested time range.

---

# 65. Historical Query Rule

The browser MUST NOT receive millions of raw telemetry points.

Example:

```text
Last 24 hours
```

should return an appropriate aggregated resolution rather than:

```text
86,400 individual points
```

where unnecessary.

---

# 66. Realtime Telemetry

Realtime updates SHOULD use WebSocket.

Example event:

```json
{
  "type": "metric.update",
  "timestamp": "2026-09-28T08:31:00Z",
  "serviceId": "svc_api",
  "metrics": {
    "requestsPerSecond": 25.3,
    "errorRate": 1.2,
    "p95LatencyMs": 281.4
  }
}
```

---

# 67. WebSocket Payload Limits

Realtime events MUST remain small.

The server MUST NOT continuously push complete raw telemetry streams to dashboards unless explicitly requested.

Preferred:

```text
Aggregated metrics
```

instead of:

```text
Every request event
```

---

# 68. Telemetry Storage

Storage SHOULD be divided by purpose.

### PostgreSQL

Use for:

```text
projects
services
environments
API keys
alert rules
incidents
configuration
```

### Redis

Use for:

```text
queues
hot state
realtime state
short-lived aggregation
rate limits
Pub/Sub
```

### Analytics Store

Use for:

```text
high-volume historical telemetry
long-range metric queries
large aggregations
```

ClickHouse MAY be introduced when scale requires it.

---

# 69. Retention

Example initial policy:

```text
Raw telemetry:       7 days
Minute aggregates:  30 days
Hourly aggregates:  90 days
Daily aggregates:   365 days
```

Retention MUST be configurable.

---

# 70. Deletion

Expired telemetry MUST be deleted automatically.

Retention jobs MUST be observable.

Example:

```text
retention.deleted_events
retention.deleted_bytes
retention.duration
```

---

# 71. Privacy

Telemetry collection MUST follow data minimization.

Default:

```text
No request body
No response body
No passwords
No authorization headers
No API keys
No cookies
No unrestricted query parameters
```

Users MUST explicitly enable additional collection.

---

# 72. Telemetry Configuration

Example:

```json
{
  "telemetry": {
    "enabled": true,
    "sampleRate": 1.0,
    "captureHeaders": false,
    "captureRequestBody": false,
    "captureResponseBody": false,
    "captureIp": false,
    "slowRequestThresholdMs": 1000
  }
}
```

---

# 73. SDK Buffering

The SDK SHOULD maintain a bounded in-memory queue.

Example:

```text
Maximum buffer:
1000 events
```

When full:

```text
drop low-priority events
```

The SDK MUST NOT continuously allocate memory.

---

# 74. SDK Batch Flush

The SDK SHOULD flush based on:

```text
batch size
time interval
application shutdown
buffer pressure
```

Example:

```text
Batch size: 50
Flush interval: 2 seconds
```

---

# 75. SDK Shutdown

During graceful application shutdown:

```text
stop accepting telemetry
      ↓
flush bounded buffer
      ↓
wait for short timeout
      ↓
shutdown
```

The SDK MUST NOT indefinitely delay application shutdown.

---

# 76. SDK Failure Isolation

Telemetry failures MUST be swallowed or handled internally.

Example:

```text
PulseTrace unavailable
        ↓
SDK logs optional diagnostic
        ↓
Application continues
```

The SDK MUST NOT do:

```text
await telemetry.send()
throw telemetry error
```

inside the application's critical request path.

---

# 77. Rate Limits

Telemetry ingestion MUST be rate-limited.

Limits MAY apply to:

```text
organization
project
environment
API key
IP
```

Example response:

```http
429 Too Many Requests
```

with:

```json
{
  "error": {
    "code": "TELEMETRY_RATE_LIMITED",
    "message": "Telemetry ingestion rate limit exceeded"
  }
}
```

---

# 78. Payload Size

Initial limits:

```text
Single event: 256 KB
Batch payload: 1 MB
```

These limits MUST be configurable.

Oversized payloads MUST be rejected.

---

# 79. Schema Versioning

Every telemetry event MUST include:

```json
{
  "schemaVersion": "1.0"
}
```

Breaking schema changes MUST increment the major version.

Example:

```text
1.0 → 1.1
```

for backward-compatible additions.

```text
1.x → 2.0
```

for breaking changes.

---

# 80. Backward Compatibility

The ingestion API SHOULD support multiple schema versions during migration.

Example:

```text
v1
v2
```

Workers MAY normalize both into a canonical internal representation.

---

# 81. Canonical Internal Event

After ingestion, PulseTrace SHOULD normalize telemetry into an internal structure:

```typescript
interface CanonicalTelemetryEvent {
  eventId: string;

  schemaVersion: string;

  timestamp: Date;
  ingestedAt: Date;

  projectId: string;
  environmentId?: string;
  serviceId: string;
  endpointId?: string;

  method: string;
  route: string;

  statusCode?: number;
  success: boolean;

  durationMs: number;

  requestBytes?: number;
  responseBytes?: number;

  requestId?: string;
  traceId?: string;
  spanId?: string;

  serviceVersion?: string;
  instanceId?: string;
  region?: string;

  cpuPercent?: number;
  memoryRssBytes?: number;
  heapUsedBytes?: number;
  eventLoopUtilization?: number;

  tags?: Record<string, string>;
}
```

---

# 82. Validation Rules

Examples:

```text
durationMs >= 0
requestBytes >= 0
responseBytes >= 0
cpuPercent >= 0
cpuPercent <= 100
eventLoopUtilization >= 0
eventLoopUtilization <= 1
statusCode >= 100
statusCode <= 599
```

Invalid values MUST be rejected.

---

# 83. Request ID

Every ingestion request SHOULD receive a PulseTrace request ID.

Example:

```text
X-Request-ID: req_pt_123456
```

This identifier is for ingestion/API debugging.

It is separate from the monitored application's:

```text
requestId
```

---

# 84. Error Response Format

All ingestion errors SHOULD follow:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TELEMETRY",
    "message": "Telemetry payload failed validation",
    "requestId": "req_pt_123"
  }
}
```

Internal stack traces MUST NOT be returned.

---

# 85. Observability of the Telemetry Pipeline

PulseTrace MUST monitor its own telemetry pipeline.

Required internal metrics:

```text
telemetry.received
telemetry.accepted
telemetry.rejected
telemetry.dropped
telemetry.duplicate
telemetry.processing_latency
telemetry.queue_depth
telemetry.worker_failures
telemetry.retry_count
telemetry.dlq_count
telemetry.ingestion_latency
```

---

# 86. Pipeline Health

A telemetry pipeline dashboard SHOULD expose:

```text
Events/sec
Accepted events/sec
Rejected events/sec
Dropped events/sec
Queue depth
Worker utilization
Processing latency
Ingestion latency
DLQ size
```

---

# 87. Data Quality

PulseTrace SHOULD track:

```text
missing timestamps
invalid routes
unknown services
unknown endpoints
invalid status codes
duplicate events
late events
sampled events
dropped events
```

This prevents dashboards from silently showing incomplete data.

---

# 88. Missing Telemetry Semantics

The system MUST distinguish:

```text
0 requests
```

from:

```text
No telemetry received
```

and:

```text
Telemetry pipeline unavailable
```

These are different states.

The dashboard MUST NOT convert missing telemetry into zero.

---

# 89. Telemetry Health State

A monitored service MAY have:

```text
HEALTHY
DEGRADED
NO_DATA
INGESTION_FAILURE
UNKNOWN
```

Example:

```text
API traffic: 0 requests
Telemetry status: NO_DATA
```

is different from:

```text
API traffic: 0 requests
Telemetry status: HEALTHY
```

---

# 90. Security Requirements

Telemetry infrastructure MUST:

- Require TLS in production
- Validate API keys
- Enforce tenant boundaries
- Rate-limit ingestion
- Validate payload sizes
- Sanitize metadata
- Prevent log injection
- Prevent secret leakage
- Avoid raw credential logging
- Restrict database access
- Restrict Redis access
- Use secret management in production

---

# 91. Logging Rules

The following MUST NOT appear in normal logs:

```text
API keys
Authorization headers
Passwords
Request bodies containing sensitive data
Response bodies
Database credentials
JWT tokens
```

Safe example:

```text
telemetry accepted
project=proj_123
events=100
request_id=req_123
```

---

# 92. Testing Requirements

Telemetry implementation MUST include:

### Unit Tests

```text
schema validation
normalization
route normalization
error classification
metric calculations
sampling
redaction
```

### Integration Tests

```text
SDK → API
API → Redis
Redis → Worker
Worker → Storage
Worker → WebSocket
```

### Load Tests

Initial targets:

```text
1,000 events/sec
5,000 events/sec
10,000 events/sec
```

Actual supported capacity MUST be measured rather than assumed.

---

# 93. Failure Scenarios

The system MUST be tested against:

```text
Redis unavailable
PostgreSQL unavailable
analytics store unavailable
worker crash
network failure
invalid telemetry
duplicate telemetry
high telemetry volume
slow consumer
WebSocket disconnect
API key revocation
clock skew
oversized payload
```

---

# 94. Graceful Degradation

If the analytics database is temporarily unavailable:

```text
Application
    ↓
Telemetry API
    ↓
Queue
    ↓
temporary buffering
```

The monitored application MUST continue operating.

If realtime WebSocket infrastructure fails:

```text
Dashboard
    ↓
historical REST API
```

must continue to function.

---

# 95. Reference Telemetry Event

Complete example:

```json
{
  "schemaVersion": "1.0",
  "eventId": "01JABC123XYZ789",
  "timestamp": "2026-09-28T08:30:21.421Z",

  "projectId": "proj_123",
  "environmentId": "env_prod",
  "serviceId": "svc_api",
  "endpointId": "ep_users",

  "service": {
    "name": "user-api",
    "version": "1.8.2",
    "instanceId": "api-01",
    "region": "ap-south-1"
  },

  "request": {
    "method": "GET",
    "route": "/api/users/:id",
    "protocol": "HTTP/1.1"
  },

  "response": {
    "statusCode": 200,
    "success": true
  },

  "performance": {
    "durationMs": 124.72
  },

  "traffic": {
    "requestBytes": 482,
    "responseBytes": 4210
  },

  "resources": {
    "cpuPercent": 48.2,
    "memoryRssBytes": 384000000,
    "heapUsedBytes": 142000000,
    "eventLoopUtilization": 0.72
  },

  "correlation": {
    "requestId": "req_abc123",
    "traceId": "trace_xyz",
    "spanId": "span_123"
  },

  "tags": {
    "deployment": "blue"
  }
}
```

---

# 96. End-to-End Telemetry Flow

```text
┌──────────────────────────┐
│   Monitored Application  │
│                          │
│   GET /api/users/123     │
└────────────┬─────────────┘
             │
             │ Instrumentation
             ▼
┌──────────────────────────┐
│      PulseTrace SDK      │
│                          │
│  Capture → Buffer → Batch│
└────────────┬─────────────┘
             │
             │ HTTPS
             ▼
┌──────────────────────────┐
│   Telemetry Ingestion    │
│                          │
│ Auth → Validate → Limit  │
└────────────┬─────────────┘
             │
             │ 202 Accepted
             ▼
┌──────────────────────────┐
│      Redis Streams       │
│                          │
│ telemetry queue          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│     Telemetry Workers    │
│                          │
│ Normalize                │
│ Aggregate                │
│ Calculate Metrics        │
│ Evaluate Alerts          │
└───────┬─────────┬────────┘
        │         │
        │         └─────────────────┐
        ▼                           ▼
┌───────────────┐          ┌────────────────┐
│ Analytics     │          │ Redis / PubSub │
│ Storage       │          │                │
└───────┬───────┘          └───────┬────────┘
        │                           │
        │ Historical                │ Realtime
        ▼                           ▼
┌──────────────────────────────────────────┐
│             PulseTrace UI                │
│                                          │
│ RPS │ Latency │ Errors │ CPU │ Memory   │
│                                          │
│ Live Graphs │ Alerts │ Incidents        │
└──────────────────────────────────────────┘
```

---

# 97. Implementation Priority

## Phase 1 — Core Telemetry

Implement:

```text
Telemetry schema
POST /api/v1/telemetry
API key authentication
Validation
Redis Streams
Worker
Request count
Error rate
Latency
```

## Phase 2 — Dashboard Metrics

Implement:

```text
P50
P95
P99
Throughput
Request size
Response size
Time-series aggregation
Historical queries
```

## Phase 3 — Realtime

Implement:

```text
WebSocket
Live metrics
Live request rate
Live error rate
Live latency
```

## Phase 4 — Resource Monitoring

Implement:

```text
CPU
Memory
Node.js heap
Event loop
Runtime information
```

## Phase 5 — Advanced Telemetry

Implement:

```text
Distributed tracing
Sampling
Synthetic monitoring
Advanced resource metrics
ClickHouse
Long-term retention
```

---

# 98. Non-Negotiable Rules

1. **Telemetry MUST never block the monitored application.**
2. **Telemetry failures MUST NOT break application requests.**
3. **All telemetry MUST be tenant-scoped.**
4. **All external telemetry MUST be validated.**
5. **Telemetry payloads MUST have strict size limits.**
6. **Request bodies MUST be disabled by default.**
7. **Response bodies MUST be disabled by default.**
8. **Secrets MUST never be collected or logged.**
9. **Raw URLs MUST be normalized into routes.**
10. **High-cardinality fields MUST NOT become uncontrolled metric dimensions.**
11. **Telemetry processing MUST be asynchronous.**
12. **Queues MUST be bounded.**
13. **Retries MUST be bounded.**
14. **Duplicate telemetry MUST be safely handled.**
15. **Timestamps MUST use UTC.**
16. **Metrics MUST have explicit definitions and units.**
17. **Percentiles MUST be calculated correctly.**
18. **Missing telemetry MUST NOT be interpreted as zero traffic.**
19. **Realtime streaming MUST use aggregated data by default.**
20. **PostgreSQL MUST NOT become an unlimited raw telemetry store.**
21. **Telemetry retention MUST be enforced.**
22. **Sampling MUST be visible and measurable.**
23. **Dropped telemetry MUST be observable.**
24. **PulseTrace MUST monitor its own telemetry pipeline.**
25. **Scalability claims MUST be backed by load testing.**
26. **Kafka, Kubernetes, distributed tracing, ML anomaly detection, and multi-region infrastructure MUST NOT be introduced merely for complexity; each requires a demonstrated requirement.**

---

# 99. Core Principle

The most important rule of PulseTrace telemetry is:

```text
The application being monitored must never depend
on the monitoring system being healthy.
```

The telemetry path is therefore intentionally asynchronous:

```text
Application
     │
     ├──────────────► User Response
     │
     ▼
  Telemetry
     │
     ▼
  PulseTrace
```

If PulseTrace disappears:

```text
PulseTrace ❌
     │
     X
     │
Application ✅
```

The monitored application continues operating.
