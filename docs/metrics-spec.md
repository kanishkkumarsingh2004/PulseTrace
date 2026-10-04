# PulseTrace Metrics Specification

**Version:** 1.0
**Status:** Draft
**Project:** PulseTrace

---

# 1. Purpose

This document defines the canonical metrics used by PulseTrace to measure API performance, reliability, traffic, resource utilization, and system health.

The purpose of this specification is to ensure that every metric has:

- A precise definition
- A defined unit
- A defined calculation method
- A defined aggregation strategy
- A defined time window
- A known data source
- Explicit missing-data semantics

PulseTrace MUST NOT expose a metric whose meaning is ambiguous.

---

# 2. Metric Categories

PulseTrace metrics are divided into:

```text
Traffic Metrics
Performance Metrics
Reliability Metrics
Error Metrics
Resource Metrics
Availability Metrics
Realtime Metrics
Telemetry Health Metrics
Alert Metrics
```

---

# 3. Metric Model

Every metric SHOULD conceptually follow:

```text
Metric
├── Name
├── Description
├── Value
├── Unit
├── Timestamp
├── Time Window
├── Dimensions
├── Aggregation
└── Data Quality
```

Example:

```text
Metric:
  name: api.request_rate
  value: 124.3
  unit: requests/sec
  window: 1 minute
  service: user-api
  environment: production
```

---

# 4. Metric Naming

Metric names MUST use lowercase dot notation.

Examples:

```text
api.request.count
api.request.rate
api.latency.avg
api.latency.p50
api.latency.p95
api.latency.p99
api.error.rate
api.error.4xx.rate
api.error.5xx.rate
```

Resource metrics:

```text
service.cpu.utilization
service.memory.rss
service.runtime.heap.used
service.runtime.event_loop.utilization
```

Telemetry pipeline metrics:

```text
telemetry.ingestion.rate
telemetry.queue.depth
telemetry.processing.latency
```

---

# 5. Metric Units

Units MUST be explicit.

Examples:

```text
requests
requests/sec
milliseconds
bytes
percent
count
ratio
connections
```

Do not use ambiguous units.

Bad:

```text
latency = 120
```

Good:

```text
latency = 120 ms
```

---

# 6. Time Model

All metric timestamps MUST use UTC.

Example:

```text
2026-09-28T08:30:00Z
```

Every metric belongs to a defined time interval.

Example:

```text
08:30:00 → 08:31:00
```

---

# 7. Metric Dimensions

Metrics MAY be grouped by:

```text
organization
project
environment
service
endpoint
HTTP method
status class
region
service version
deployment
```

Example:

```text
api.request.rate
  project=proj_123
  environment=production
  service=user-api
  endpoint=/api/users/:id
  method=GET
```

---

# 8. High-Cardinality Restrictions

The following MUST NOT be used as unrestricted metric dimensions:

```text
requestId
traceId
spanId
userId
email
sessionId
raw URL
UUID
IP address
transaction ID
```

Otherwise the number of metric series can grow without bound.

---

# 9. Traffic Metrics

## 9.1 Request Count

Metric:

```text
api.request.count
```

Definition:

```text
Number of successfully ingested request telemetry events
during the selected time interval.
```

Example:

```text
1 minute
1000 requests
```

Value:

```text
1000
```

---

# 10. Request Rate

Metric:

```text
api.request.rate
```

Definition:

```text
Total requests / duration of interval
```

Example:

```text
600 requests
60 seconds

600 / 60 = 10 requests/sec
```

Unit:

```text
requests/sec
```

---

# 11. Requests Per Minute

Metric:

```text
api.request.rate.minute
```

Definition:

```text
Number of requests within one minute.
```

Example:

```text
08:30 → 08:31
1520 requests
```

Value:

```text
1520 requests/min
```

This is not necessarily equivalent to:

```text
1520 requests/sec
```

The UI MUST clearly display the unit.

---

# 12. Peak Request Rate

Metric:

```text
api.request.rate.peak
```

Definition:

```text
Maximum request rate observed within the selected period.
```

Example:

```text
1-hour period

Maximum 1-minute rate:
420 requests/sec
```

---

# 13. Throughput

PulseTrace uses throughput to represent the volume of data processed.

Metrics:

```text
api.throughput.request_bytes
api.throughput.response_bytes
```

Example:

```text
Total response bytes:
500 MB

Time:
60 seconds

Throughput:
8.33 MB/sec
```

---

# 14. Request Size

Metric:

```text
api.request.size
```

Measured in:

```text
bytes
```

PulseTrace SHOULD expose:

```text
min
max
avg
p50
p95
p99
```

---

# 15. Response Size

Metric:

```text
api.response.size
```

Measured in:

```text
bytes
```

Supported aggregations:

```text
min
max
avg
p50
p95
p99
total
```

---

# 16. Latency Metrics

Latency is one of PulseTrace's primary metrics.

Supported:

```text
api.latency.min
api.latency.max
api.latency.avg
api.latency.p50
api.latency.p75
api.latency.p90
api.latency.p95
api.latency.p99
```

Unit:

```text
milliseconds
```

---

# 17. Minimum Latency

Definition:

```text
Minimum request duration observed
within the selected interval.
```

Example:

```text
min = 4.2 ms
```

---

# 18. Maximum Latency

Definition:

```text
Maximum request duration observed
within the selected interval.
```

Example:

```text
max = 4,921.3 ms
```

Maximum latency is useful for detecting extreme spikes.

---

# 19. Average Latency

Formula:

```text
Average Latency =
Σ(durationMs) / requestCount
```

Example:

```text
Request durations:

100
200
300

Average:
600 / 3
= 200 ms
```

Average latency MUST NOT be used as a replacement for percentile latency.

---

# 20. Median / P50

Definition:

```text
P50 = 50th percentile latency
```

Interpretation:

```text
50% of requests completed
at or below this latency.
```

Example:

```text
P50 = 95 ms
```

---

# 21. P75

Definition:

```text
75% of requests completed
at or below this latency.
```

Example:

```text
P75 = 140 ms
```

---

# 22. P90

Definition:

```text
90% of requests completed
at or below this latency.
```

Example:

```text
P90 = 190 ms
```

---

# 23. P95

Definition:

```text
95% of requests completed
at or below this latency.
```

Example:

```text
P95 = 300 ms
```

P95 SHOULD be one of the primary dashboard latency metrics.

---

# 24. P99

Definition:

```text
99% of requests completed
at or below this latency.
```

Example:

```text
P99 = 780 ms
```

P99 helps identify tail latency.

---

# 25. Percentile Requirements

PulseTrace MUST NOT calculate:

```text
P95 ≈ average × 1.5
```

or similar approximations.

Percentiles MUST be calculated using a defined statistical algorithm.

Possible implementations:

```text
Exact percentile
HDR Histogram
t-digest
DDSketch
```

The selected implementation MUST be documented and tested.

---

# 26. Percentile Consistency

The same percentile algorithm SHOULD be used across:

```text
Realtime metrics
Historical metrics
Alerts
API responses
Dashboard
```

Differences are allowed only when explicitly documented.

---

# 27. Error Metrics

PulseTrace distinguishes:

```text
4xx errors
5xx errors
network errors
timeouts
application errors
```

---

# 28. Total Error Rate

Metric:

```text
api.error.rate
```

Formula:

```text
Error Rate =
Error Requests / Total Requests × 100
```

Example:

```text
Total = 10,000
Errors = 250

Error Rate =
250 / 10,000 × 100

= 2.5%
```

---

# 29. 4xx Rate

Metric:

```text
api.error.4xx.rate
```

Formula:

```text
4xx Responses / Total Requests × 100
```

Example:

```text
Total requests = 10,000
4xx = 150

4xx rate = 1.5%
```

---

# 30. 5xx Rate

Metric:

```text
api.error.5xx.rate
```

Formula:

```text
5xx Responses / Total Requests × 100
```

Example:

```text
Total = 10,000
5xx = 100

5xx rate = 1%
```

---

# 31. Network Error Rate

Metric:

```text
api.error.network.rate
```

Formula:

```text
Network Errors / Total Requests × 100
```

Network failures include events where an HTTP response was never successfully received.

Examples:

```text
DNS failure
connection refused
socket failure
TLS failure
connection timeout
```

---

# 32. Timeout Rate

Metric:

```text
api.error.timeout.rate
```

Formula:

```text
Timeout Requests / Total Requests × 100
```

Timeouts MUST remain distinguishable from HTTP 5xx responses.

---

# 33. Error Count

Metrics:

```text
api.error.count
api.error.4xx.count
api.error.5xx.count
api.error.network.count
api.error.timeout.count
```

Counts MUST be integers.

---

# 34. Error Budget Metrics

Future versions MAY support:

```text
availability target
error budget
error budget consumed
error budget remaining
```

Example:

```text
SLO:
99.9%

Allowed monthly error budget:
0.1%
```

Error budget functionality MUST be based on an explicitly defined SLO window.

---

# 35. Availability

Metric:

```text
api.availability
```

A basic request-based availability calculation:

```text
Availability =
Successful Requests / Total Requests × 100
```

Example:

```text
Total = 100,000
Failed = 50

Availability =
99.95%
```

The exact success criteria MUST be configurable.

---

# 36. Availability vs Uptime

PulseTrace MUST distinguish:

```text
Request availability
```

from:

```text
Infrastructure uptime
```

A service can be running while returning failed responses.

Therefore:

```text
process alive ≠ API available
```

---

# 37. Health Check Availability

Synthetic health checks MAY produce:

```text
synthetic.availability
```

This is separate from request-derived availability.

---

# 38. Resource Metrics

Resource metrics describe the monitored service/runtime.

Supported metrics:

```text
service.cpu.utilization
service.memory.rss
service.memory.heap.used
service.memory.heap.total
service.runtime.event_loop.utilization
```

---

# 39. CPU Utilization

Metric:

```text
service.cpu.utilization
```

Unit:

```text
percent
```

Example:

```text
CPU = 72.4%
```

The metric MUST specify whether it represents:

```text
process CPU
container CPU
host CPU
```

The initial PulseTrace implementation SHOULD prioritize process/container CPU.

---

# 40. CPU Aggregation

For a selected interval:

```text
min
max
avg
p95
```

may be exposed.

Example:

```text
CPU:

min = 20%
avg = 54%
p95 = 83%
max = 96%
```

---

# 41. Memory RSS

Metric:

```text
service.memory.rss
```

Definition:

```text
Resident Set Size of the monitored process/container.
```

Unit:

```text
bytes
```

Dashboard MAY display:

```text
512 MB
```

---

# 42. Heap Used

Node.js metric:

```text
service.memory.heap.used
```

Unit:

```text
bytes
```

Definition:

```text
Memory currently used by the runtime heap.
```

---

# 43. Heap Total

Metric:

```text
service.memory.heap.total
```

Definition:

```text
Total runtime heap currently allocated/available
according to the runtime.
```

---

# 44. Heap Utilization

Formula:

```text
Heap Utilization =
Heap Used / Heap Total × 100
```

Example:

```text
Heap Used = 400 MB
Heap Total = 800 MB

Utilization = 50%
```

---

# 45. Event Loop Utilization

Metric:

```text
service.runtime.event_loop.utilization
```

For Node.js:

```text
0.0 → 1.0
```

Example:

```text
0.82
```

Dashboard MAY display:

```text
82%
```

This metric indicates event-loop busy time relative to the measurement interval.

It MUST NOT be presented as CPU utilization.

---

# 46. Resource Correlation

PulseTrace SHOULD allow users to correlate:

```text
Latency
+
CPU
+
Memory
+
Event Loop
```

Example:

```text
CPU ↑
     +
Event Loop ↑
     +
P99 Latency ↑
```

The dashboard may visually display these metrics together.

The UI MUST NOT imply causation solely from correlation.

---

# 47. Database Metrics

Future instrumentation MAY expose:

```text
db.query.count
db.query.duration
db.query.error.rate
db.connection.active
db.connection.pool.utilization
```

These SHOULD remain separate from HTTP request metrics.

---

# 48. External API Metrics

PulseTrace MAY later support dependency metrics:

```text
dependency.request.count
dependency.latency
dependency.error.rate
dependency.timeout.rate
```

Example:

```text
user-api
   |
   ├── PostgreSQL
   ├── Redis
   └── Stripe API
```

---

# 49. Endpoint Metrics

Every endpoint SHOULD have independent metrics.

Example:

```text
GET /api/users
POST /api/users
GET /api/users/:id
DELETE /api/users/:id
```

Each endpoint receives:

```text
request count
request rate
latency
error rate
response size
```

---

# 50. Service-Level Metrics

Service metrics aggregate across endpoints.

Example:

```text
user-api
```

includes:

```text
/api/users
/api/users/:id
/api/profile
```

Service-level latency SHOULD be calculated from the underlying request events rather than averaging endpoint averages.

---

# 51. Project-Level Metrics

Project metrics aggregate across services.

Example:

```text
Project
├── API
├── Worker
├── Auth
└── Notification
```

Project metrics MUST be calculated from the underlying telemetry or appropriate weighted aggregates.

---

# 52. Weighted Aggregation

Incorrect:

```text
Endpoint A avg = 10 ms
Endpoint B avg = 1000 ms

Project avg =
(10 + 1000) / 2
= 505 ms
```

This is generally incorrect.

Correct aggregation requires request counts:

```text
Project Average =
Σ(duration across all requests) /
Total request count
```

---

# 53. Rate Aggregation

Rates MUST use actual interval duration.

Example:

```text
100 requests
20 seconds

Rate =
100 / 20

= 5 requests/sec
```

Do not assume every bucket has exactly one minute of valid data.

---

# 54. Empty Intervals

If no requests occurred:

```text
request.count = 0
```

But latency metrics should generally be:

```text
null
```

rather than:

```text
0 ms
```

Example:

```json
{
  "requestCount": 0,
  "avgLatencyMs": null,
  "p95LatencyMs": null
}
```

Zero latency would incorrectly imply requests completed instantly.

---

# 55. Missing Data

PulseTrace MUST distinguish:

```text
0 requests
```

from:

```text
no telemetry
```

from:

```text
telemetry system unavailable
```

Suggested state:

```text
DATA
NO_TRAFFIC
NO_DATA
UNAVAILABLE
```

---

# 56. Metric Data Quality

Metric responses SHOULD contain quality metadata where useful.

Example:

```json
{
  "value": 120.4,
  "unit": "ms",
  "dataQuality": {
    "sampled": false,
    "complete": true,
    "droppedEvents": 0
  }
}
```

---

# 57. Sampling Metadata

If sampling is enabled:

```json
{
  "sampleRate": 0.1,
  "sampled": true
}
```

The dashboard MUST clearly indicate sampled data.

---

# 58. Dropped Telemetry

If events were dropped:

```json
{
  "dataQuality": {
    "droppedEvents": 120
  }
}
```

Metrics MUST NOT silently present incomplete data as complete.

---

# 59. Time-Series Resolution

PulseTrace SHOULD dynamically select metric resolution.

Example:

```text
Last 15 minutes
→ 10-second buckets

Last 6 hours
→ 1-minute buckets

Last 7 days
→ 1-hour buckets

Last 90 days
→ daily buckets
```

Exact thresholds SHOULD be configurable.

---

# 60. Dashboard Data Point Limits

A dashboard query SHOULD normally return no more than approximately:

```text
1,000–2,000 points per series
```

If more data exists, the backend SHOULD aggregate it.

The browser MUST NOT be responsible for aggregating millions of raw events.

---

# 61. Real-Time Metrics

Realtime metrics SHOULD update approximately every:

```text
1–5 seconds
```

depending on configuration and system load.

Realtime metrics:

```text
request rate
error rate
p95 latency
p99 latency
CPU
memory
active connections
```

---

# 62. Realtime Window

The realtime dashboard SHOULD use a rolling window.

Example:

```text
Last 60 seconds
```

with buckets:

```text
10 × 6-second
```

or an equivalent aggregation strategy.

---

# 63. Active Requests

Future instrumentation MAY provide:

```text
api.requests.active
```

Definition:

```text
Number of currently executing monitored requests.
```

This requires runtime instrumentation beyond completed request telemetry.

---

# 64. Concurrent Requests

Metric:

```text
api.requests.concurrent
```

Example:

```text
At 08:30:15:

active requests = 42
```

This metric is particularly useful for identifying saturation.

---

# 65. Saturation

PulseTrace SHOULD eventually support saturation indicators:

```text
CPU saturation
memory pressure
event loop saturation
connection pool saturation
worker queue saturation
```

These MUST have explicit definitions.

---

# 66. Queue Metrics

For PulseTrace internal queues:

```text
telemetry.queue.depth
telemetry.queue.age
telemetry.queue.processing.rate
```

Example:

```text
Queue depth:
15,420 events
```

---

# 67. Ingestion Rate

Metric:

```text
telemetry.ingestion.rate
```

Definition:

```text
Telemetry events accepted per second.
```

Example:

```text
5,200 events/sec
```

---

# 68. Ingestion Latency

Metric:

```text
telemetry.ingestion.latency
```

Definition:

```text
Time between telemetry generation and PulseTrace ingestion.
```

Formula:

```text
ingestedAt - timestamp
```

---

# 69. Processing Latency

Metric:

```text
telemetry.processing.latency
```

Definition:

```text
Time between queue acceptance
and successful processing.
```

This is different from API request latency.

---

# 70. Queue Age

Metric:

```text
telemetry.queue.age
```

Definition:

```text
Current time - oldest unprocessed telemetry timestamp
```

High queue age indicates processing lag.

---

# 71. Worker Metrics

Required worker metrics:

```text
worker.processed
worker.failed
worker.retried
worker.processing_time
worker.active
```

---

# 72. WebSocket Metrics

PulseTrace SHOULD expose:

```text
websocket.connections
websocket.messages.sent
websocket.messages.dropped
websocket.errors
websocket.connection.duration
```

---

# 73. Alert Metrics

Alerting may consume:

```text
api.error.rate
api.latency.p95
api.latency.p99
api.request.rate
service.cpu.utilization
service.memory.rss
telemetry.queue.depth
```

Alerts MUST reference canonical metrics.

---

# 74. Alert Evaluation

Example:

```text
IF
api.latency.p95 > 500 ms

FOR
5 minutes

THEN
trigger alert
```

The metric and its calculation MUST be deterministic.

---

# 75. Alert Evaluation Windows

Supported windows SHOULD include:

```text
1 minute
5 minutes
10 minutes
15 minutes
30 minutes
1 hour
```

Future versions MAY support arbitrary windows.

---

# 76. Alert Flapping

Alerting SHOULD support recovery thresholds.

Example:

```text
Trigger:
P95 > 500 ms

Resolve:
P95 < 400 ms
```

This prevents repeated:

```text
TRIGGER
RESOLVE
TRIGGER
RESOLVE
```

when the value hovers around one threshold.

---

# 77. Metric Storage Model

Conceptual metric record:

```typescript
interface MetricPoint {
  metric: string;

  timestamp: Date;

  projectId: string;
  environmentId?: string;
  serviceId?: string;
  endpointId?: string;

  value: number;

  unit: string;

  dimensions?: Record<string, string>;

  sampleRate?: number;

  dataQuality?: {
    sampled: boolean;
    complete: boolean;
    droppedEvents: number;
  };
}
```

---

# 78. Aggregate Record

Conceptual aggregate:

```typescript
interface MetricAggregate {
  bucketStart: Date;
  bucketEnd: Date;

  requestCount: number;

  errorCount: number;
  clientErrorCount: number;
  serverErrorCount: number;

  latency: {
    min: number | null;
    max: number | null;
    avg: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    p95: number | null;
    p99: number | null;
  };

  traffic: {
    requestBytes: number;
    responseBytes: number;
  };
}
```

---

# 79. Metric Query API

Historical metric queries SHOULD use:

```http
GET /api/v1/metrics
```

Example:

```text
/api/v1/metrics
  ?serviceId=svc_api
  &metric=api.latency.p95
  &from=2026-09-28T08:00:00Z
  &to=2026-09-28T09:00:00Z
```

---

# 80. Metric Query Requirements

Every metric query MUST have:

```text
project scope
time range
metric name
```

The backend MUST enforce maximum query ranges.

---

# 81. Metric Query Response

Example:

```json
{
  "metric": "api.latency.p95",
  "unit": "ms",
  "resolution": "1m",
  "points": [
    {
      "timestamp": "2026-09-28T08:00:00Z",
      "value": 182.2
    },
    {
      "timestamp": "2026-09-28T08:01:00Z",
      "value": 194.7
    }
  ]
}
```

---

# 82. Comparison Metrics

The dashboard MAY compare:

```text
Current period
Previous period
```

Example:

```text
Today:
P95 = 240 ms

Yesterday:
P95 = 180 ms
```

The UI SHOULD display the difference explicitly.

Example:

```text
+33.3%
```

The comparison MUST use equivalent time windows.

---

# 83. Baseline Metrics

Future versions MAY support historical baselines:

```text
Typical P95
Typical request rate
Typical error rate
```

Baselines MUST be calculated from documented historical periods.

---

# 84. Anomaly Detection

Automatic anomaly detection is NOT part of the initial metric engine.

Future anomaly detection MAY consume:

```text
request rate
latency
error rate
resource metrics
```

Any anomaly score MUST be clearly distinguished from raw metrics.

---

# 85. Metric Cardinality Budget

Each project SHOULD have a configurable cardinality budget.

Example:

```text
Maximum active metric series:
100,000
```

When approaching the limit:

```text
warning
```

At the limit:

```text
reject new high-cardinality dimensions
```

---

# 86. Metric Retention

Recommended initial retention:

```text
Raw telemetry:
7 days

10-second aggregates:
24 hours

1-minute aggregates:
30 days

1-hour aggregates:
90 days

Daily aggregates:
365 days
```

Retention MAY vary by plan/project.

---

# 87. Downsampling

Older metrics SHOULD be downsampled.

Example:

```text
10-second
      ↓
1-minute
      ↓
1-hour
      ↓
1-day
```

Downsampling MUST preserve meaningful statistics.

Averages alone MUST NOT replace percentile information where percentile accuracy is required.

---

# 88. Metric Integrity

Metrics MUST be reproducible.

For example:

```text
api.error.rate
```

must always use the same definition.

Changing the meaning of a metric without versioning/configuration is prohibited.

---

# 89. Metric Metadata

Every canonical metric SHOULD have metadata:

```json
{
  "name": "api.latency.p95",
  "description": "95th percentile request latency",
  "unit": "ms",
  "type": "histogram_percentile",
  "source": "telemetry"
}
```

---

# 90. Metric Types

Supported conceptual types:

```text
Counter
Gauge
Rate
Histogram
Percentile
Ratio
```

### Counter

Monotonically increasing event count.

### Gauge

Current measured value.

### Rate

Events per unit time.

### Histogram

Distribution of observations.

### Percentile

Percentile derived from a histogram/distribution.

### Ratio

One quantity divided by another.

---

# 91. Counter Rules

Counters MUST NOT decrease within the same logical cumulative series unless a reset is explicitly represented.

Example:

```text
request_total:
100
150
200
```

If a process restarts, the system MUST handle the reset correctly.

---

# 92. Gauge Rules

Gauges may increase or decrease.

Examples:

```text
CPU
memory
active connections
queue depth
```

---

# 93. Histogram Rules

Histograms SHOULD be used internally for:

```text
latency
request size
response size
```

They allow efficient percentile calculations without retaining every raw measurement indefinitely.

---

# 94. Metric Calculation Source of Truth

The source of truth for API metrics is telemetry.

Example:

```text
request count
    ↓
telemetry events

latency
    ↓
telemetry duration

error rate
    ↓
telemetry status/classification
```

Metrics MUST NOT be independently guessed by the frontend.

---

# 95. Frontend Rules

The frontend MUST NOT calculate core metrics from already aggregated display values when doing so would introduce mathematical errors.

For example, do not calculate project P95 by averaging endpoint P95 values.

The backend MUST provide canonical values.

---

# 96. Dashboard Visualization Rules

Recommended visualizations:

### Request Rate

```text
Line chart
```

### Latency

```text
P50/P95/P99 line chart
```

### Error Rate

```text
Line chart
```

### Status Distribution

```text
Stacked area/bar chart
```

### CPU

```text
Line chart
```

### Memory

```text
Line chart
```

### Request Volume

```text
Area chart
```

---

# 97. Visualization Requirements

Graphs MUST:

- Show units
- Show timestamps
- Support hover details
- Handle null values
- Handle missing data
- Handle spikes
- Show selected time range
- Indicate sampling where applicable
- Avoid visually implying zero when data is unavailable

---

# 98. No-Data Visualization

If no telemetry exists:

```text
No telemetry data available
```

If requests genuinely equal zero:

```text
0 requests
```

If telemetry is unavailable:

```text
Telemetry unavailable
```

These states MUST NOT look identical.

---

# 99. Core Dashboard Metrics

The primary service dashboard SHOULD show:

```text
Requests
Requests/sec
Error rate
P50 latency
P95 latency
P99 latency
4xx rate
5xx rate
CPU
Memory
```

---

# 100. Endpoint Dashboard Metrics

Each endpoint SHOULD show:

```text
Request count
Request rate
Average latency
P50
P95
P99
4xx rate
5xx rate
Request size
Response size
```

---

# 101. Service Dashboard

Each service SHOULD expose:

```text
Total requests
Request rate
Error rate
P95
P99
CPU
Memory
Event loop utilization
Active instances
```

---

# 102. Project Dashboard

Project-level metrics:

```text
Total requests
Overall error rate
Overall P95
Overall P99
Services
Endpoints
Incidents
Alerts
Telemetry health
```

---

# 103. Metric Dependencies

Conceptually:

```text
                    Telemetry
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Traffic      Latency       Errors
          │            │            │
          └────────────┼────────────┘
                       ▼
                   Reliability
                       │
              ┌────────┴────────┐
              ▼                 ▼
           Alerts            Dashboard
```

---

# 104. Recommended Initial Metric Set

For MVP, implement only:

```text
api.request.count
api.request.rate
api.latency.avg
api.latency.p50
api.latency.p95
api.latency.p99
api.error.count
api.error.rate
api.error.4xx.rate
api.error.5xx.rate
api.request.size
api.response.size
service.cpu.utilization
service.memory.rss
```

Do not build every possible metric before the core telemetry pipeline works.

---

# 105. Phase 2 Metrics

Add:

```text
P75
P90
timeout rate
network error rate
event loop utilization
heap utilization
active requests
concurrent requests
```

---

# 106. Phase 3 Metrics

Add:

```text
dependency latency
database metrics
connection pool metrics
queue metrics
synthetic availability
SLO
error budgets
```

---

# 107. Future Metrics

Potential future capabilities:

```text
distributed tracing
service maps
anomaly scores
forecasting
cost metrics
infrastructure metrics
container metrics
Kubernetes metrics
cloud-provider metrics
```

These MUST remain outside the core MVP until there is a demonstrated requirement.

---

# 108. Non-Negotiable Metric Rules

1. Every metric MUST have a defined meaning.
2. Every metric MUST have a defined unit.
3. Every metric MUST have a defined time window.
4. Every metric MUST have a defined source.
5. Percentiles MUST be calculated using a documented method.
6. Averages MUST NOT replace percentiles.
7. Endpoint averages MUST NOT be averaged to calculate service averages.
8. Missing data MUST NOT be represented as zero.
9. Zero traffic MUST remain distinguishable from missing telemetry.
10. High-cardinality identifiers MUST NOT become uncontrolled metric dimensions.
11. Metrics MUST be tenant-scoped.
12. Historical queries MUST have bounded time ranges.
13. The frontend MUST NOT be the source of truth for core metrics.
14. Realtime metrics MUST use bounded data.
15. Sampling MUST be visible.
16. Dropped telemetry MUST be measurable.
17. Resource metrics MUST specify their measurement scope.
18. CPU and event-loop utilization MUST NOT be treated as the same metric.
19. Availability MUST be distinguished from process uptime.
20. Downsampling MUST preserve statistically meaningful information.
21. Retention MUST be enforced.
22. Metric definitions MUST remain stable or be explicitly versioned.
23. Alert conditions MUST reference canonical metrics.
24. Metric calculations MUST be tested with known datasets.
25. Performance claims MUST be validated using measured telemetry workloads.

---

# 109. Metric Philosophy

PulseTrace should follow one central rule:

```text
Do not make the graph look useful.
Make the number mean something.
```

A graph with beautiful real-time animations is not useful if:

```text
P95 is actually an average
0 means missing data
routes contain random IDs
CPU semantics are undefined
sampled data appears complete
```

The metric engine therefore prioritizes:

```text
Correctness
    ↓
Consistency
    ↓
Data quality
    ↓
Performance
    ↓
Visualization
```

The dashboard is only as trustworthy as the metric definitions underneath it.
