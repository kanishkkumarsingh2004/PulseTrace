export type MetricWindow = '1m' | '5m' | '1h' | '1d';

export interface Percentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface MetricSummary {
  requestCount: number;
  errorCount: number;
  errorRate: number; // percentage 0-100
  rps: number;
  latency: Percentiles;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
}

export interface TimeseriesDataPoint {
  timestamp: string; // ISO-8601 UTC
  requestCount: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  avgLatencyMs: number;
  cpuUsagePercent?: number;
  memoryUsageBytes?: number;
}

export interface MetricBucketData {
  id: string;
  projectId: string;
  serviceId: string;
  endpointId?: string;
  environment: string;
  window: MetricWindow;
  bucketStart: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
}
