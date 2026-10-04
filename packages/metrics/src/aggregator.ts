import {
  AnalysisConfig,
  AnalysisReport,
  EndpointInfo,
  EndpointMetrics,
  HttpMethod,
  MetricSummary,
  RequestResult,
  TelemetryPayload,
} from "@pulsetrace/types";
import { calculatePercentiles } from "./percentiles.js";

const EMPTY_PERCENTILES = { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };

function emptySummary(): MetricSummary {
  return {
    requestCount: 0,
    errorCount: 0,
    errorRate: 0,
    rps: 0,
    latency: { ...EMPTY_PERCENTILES },
    minLatencyMs: 0,
    maxLatencyMs: 0,
    avgLatencyMs: 0,
  };
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function toEpoch(iso: string): number {
  return Date.parse(iso);
}

/** A request counts as an error when the transport failed, the SDK recorded an error, or the server answered 4xx/5xx. */
function isErrorResult(result: RequestResult): boolean {
  return (
    result.statusCode === 0 ||
    result.statusCode >= 400 ||
    result.error !== undefined
  );
}

function tallyStatusCodes(results: RequestResult[]): Record<string, number> {
  const statusCodes: Record<string, number> = {};
  for (const result of results) {
    const key = String(result.statusCode);
    statusCodes[key] = (statusCodes[key] ?? 0) + 1;
  }
  return statusCodes;
}

export function aggregateTelemetryEvents(
  events: TelemetryPayload[],
  timeWindowSeconds: number = 60,
): MetricSummary {
  if (events.length === 0) {
    return emptySummary();
  }

  const requestCount = events.length;
  let errorCount = 0;
  const latencies: number[] = [];
  let totalLatency = 0;
  let minLatency = Number.POSITIVE_INFINITY;
  let maxLatency = 0;

  for (const ev of events) {
    const isErr =
      ev.error?.isError || (ev.response && ev.response.statusCode >= 400);
    if (isErr) {
      errorCount++;
    }

    const duration = ev.response?.durationMs ?? 0;
    latencies.push(duration);
    totalLatency += duration;
    if (duration < minLatency) minLatency = duration;
    if (duration > maxLatency) maxLatency = duration;
  }

  return {
    requestCount,
    errorCount,
    errorRate: round2((errorCount / requestCount) * 100),
    rps: timeWindowSeconds > 0 ? round2(requestCount / timeWindowSeconds) : 0,
    latency: calculatePercentiles(latencies),
    minLatencyMs: minLatency,
    maxLatencyMs: maxLatency,
    avgLatencyMs: round2(totalLatency / requestCount),
  };
}

/**
 * Summarizes raw load-generator results (as opposed to SDK telemetry events) into a
 * `MetricSummary`. Requests that never received a response use `statusCode: 0`.
 */
export function aggregateRequestResults(
  results: RequestResult[],
  durationSeconds: number = 1,
): MetricSummary {
  if (results.length === 0) {
    return emptySummary();
  }

  const requestCount = results.length;
  let errorCount = 0;
  const latencies: number[] = [];
  let totalLatency = 0;
  let minLatency = Number.POSITIVE_INFINITY;
  let maxLatency = 0;

  for (const result of results) {
    if (isErrorResult(result)) {
      errorCount++;
    }

    const duration = result.durationMs;
    latencies.push(duration);
    totalLatency += duration;
    if (duration < minLatency) minLatency = duration;
    if (duration > maxLatency) maxLatency = duration;
  }

  return {
    requestCount,
    errorCount,
    errorRate: round2((errorCount / requestCount) * 100),
    rps: durationSeconds > 0 ? round2(requestCount / durationSeconds) : 0,
    latency: calculatePercentiles(latencies),
    minLatencyMs: minLatency,
    maxLatencyMs: maxLatency,
    avgLatencyMs: round2(totalLatency / requestCount),
  };
}

/**
 * Groups results by endpoint and produces per-endpoint stats. Endpoints present in
 * `endpoints` but never exercised are still reported with zeroed counters, so a stalled
 * endpoint is visible instead of silently missing.
 */
export function aggregateEndpointMetrics(
  results: RequestResult[],
  durationSeconds: number = 1,
  endpoints: EndpointInfo[] = [],
): EndpointMetrics[] {
  const resultsByEndpoint = new Map<string, RequestResult[]>();
  const methodByEndpoint = new Map<string, HttpMethod>();

  for (const result of results) {
    const bucket = resultsByEndpoint.get(result.endpoint);
    if (bucket) {
      bucket.push(result);
    } else {
      resultsByEndpoint.set(result.endpoint, [result]);
      methodByEndpoint.set(result.endpoint, result.method);
    }
  }

  for (const endpoint of endpoints) {
    if (!resultsByEndpoint.has(endpoint.path)) {
      resultsByEndpoint.set(endpoint.path, []);
      methodByEndpoint.set(endpoint.path, endpoint.method);
    }
  }

  const sourceByPath = new Map<string, EndpointInfo["source"]>(
    endpoints.map((endpoint) => [endpoint.path, endpoint.source]),
  );

  const metrics: EndpointMetrics[] = [];
  for (const [endpoint, bucket] of resultsByEndpoint) {
    const summary = aggregateRequestResults(bucket, durationSeconds);
    metrics.push({
      endpoint,
      method: methodByEndpoint.get(endpoint) ?? "GET",
      source: sourceByPath.get(endpoint),
      count: summary.requestCount,
      rps: summary.rps,
      latency: summary.latency,
      minLatencyMs: summary.minLatencyMs,
      maxLatencyMs: summary.maxLatencyMs,
      avgLatencyMs: summary.avgLatencyMs,
      errorRate: summary.errorRate,
      statusCodes: tallyStatusCodes(bucket),
    });
  }

  metrics.sort(
    (a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint),
  );
  return metrics;
}

function timestampRange(results: RequestResult[]): {
  startTime: string;
  endTime: string;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const result of results) {
    const epoch = toEpoch(result.timestamp);
    if (Number.isNaN(epoch)) continue;
    if (epoch < min) min = epoch;
    if (epoch > max) max = epoch;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    const fallback = new Date().toISOString();
    return { startTime: fallback, endTime: fallback };
  }

  return {
    startTime: new Date(min).toISOString(),
    endTime: new Date(max).toISOString(),
  };
}

/**
 * Builds the full analysis report from a completed run. `results` may be empty (for
 * example a run aborted during discovery) — the report is still well formed.
 */
export function buildAnalysisReport(
  config: AnalysisConfig,
  endpoints: EndpointInfo[],
  results: RequestResult[],
): AnalysisReport {
  const summary = aggregateRequestResults(results, config.durationSeconds);
  const { startTime, endTime } = timestampRange(results);

  return {
    targetUrl: config.targetUrl,
    endpointsDiscovered: endpoints.length,
    virtualUsers: config.virtualUsers,
    durationSeconds: config.durationSeconds,
    totalRequests: summary.requestCount,
    rps: summary.rps,
    latency: summary.latency,
    errorRate: summary.errorRate,
    statusCodes: tallyStatusCodes(results),
    availability: round2(100 - summary.errorRate),
    perEndpoint: aggregateEndpointMetrics(
      results,
      config.durationSeconds,
      endpoints,
    ),
    startTime,
    endTime,
  };
}
