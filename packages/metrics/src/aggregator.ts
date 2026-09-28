import { TelemetryPayload, MetricSummary } from '@pulsetrace/types';
import { calculatePercentiles } from './percentiles.js';

export function aggregateTelemetryEvents(
  events: TelemetryPayload[],
  timeWindowSeconds: number = 60
): MetricSummary {
  if (events.length === 0) {
    return {
      requestCount: 0,
      errorCount: 0,
      errorRate: 0,
      rps: 0,
      latency: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
      minLatencyMs: 0,
      maxLatencyMs: 0,
      avgLatencyMs: 0,
    };
  }

  const requestCount = events.length;
  let errorCount = 0;
  const latencies: number[] = [];
  let totalLatency = 0;

  for (const ev of events) {
    const isErr = ev.error?.isError || (ev.response && ev.response.statusCode >= 400);
    if (isErr) {
      errorCount++;
    }

    const duration = ev.response?.durationMs ?? 0;
    latencies.push(duration);
    totalLatency += duration;
  }

  const errorRate = Number(((errorCount / requestCount) * 100).toFixed(2));
  const rps = Number((requestCount / timeWindowSeconds).toFixed(2));
  const minLatencyMs = Math.min(...latencies);
  const maxLatencyMs = Math.max(...latencies);
  const avgLatencyMs = Number((totalLatency / requestCount).toFixed(2));
  const latency = calculatePercentiles(latencies);

  return {
    requestCount,
    errorCount,
    errorRate,
    rps,
    latency,
    minLatencyMs,
    maxLatencyMs,
    avgLatencyMs,
  };
}
