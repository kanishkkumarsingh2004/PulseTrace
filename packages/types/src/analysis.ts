import { Percentiles } from "./metrics.js";

export type HttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type EndpointSource = "robots" | "sitemap";

export interface EndpointInfo {
  method: HttpMethod;
  /** Path discovered on the target, e.g. `/api/products`. Always starts with `/`. */
  path: string;
  source: EndpointSource;
  /** ISO-8601 UTC timestamp of when the endpoint was discovered. */
  discoveredAt: string;
}

export interface AnalysisConfig {
  targetUrl: string;
  durationSeconds: number;
  virtualUsers: number;
  /** Parallel in-flight requests each virtual user is allowed to keep open. */
  concurrencyPerUser: number;
}

export interface RequestResult {
  /** Endpoint path (or absolute URL) that was exercised. */
  endpoint: string;
  method: HttpMethod;
  /** HTTP status code, or `0` when no response was received (DNS/TCP/TLS/timeout). */
  statusCode: number;
  durationMs: number;
  /** Failure reason when the request did not produce a response. */
  error?: string;
  /** ISO-8601 UTC timestamp of when the request completed. */
  timestamp: string;
  responseSize: number;
}

export interface EndpointMetrics {
  endpoint: string;
  method: HttpMethod;
  /** Where the endpoint was discovered from, when known. */
  source?: EndpointSource;
  count: number;
  rps: number;
  latency: Percentiles;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  /** Percentage 0-100 of requests that failed (status >= 400, status 0, or transport error). */
  errorRate: number;
  /** Request counts keyed by status code as a string; `'0'` holds transport failures. */
  statusCodes: Record<string, number>;
}

export interface AnalysisReport {
  targetUrl: string;
  endpointsDiscovered: number;
  virtualUsers: number;
  durationSeconds: number;
  totalRequests: number;
  rps: number;
  latency: Percentiles;
  /** Percentage 0-100 of requests that failed. */
  errorRate: number;
  /** Request counts keyed by status code as a string; `'0'` holds transport failures. */
  statusCodes: Record<string, number>;
  /** Percentage 0-100 of requests that returned a non-error response. */
  availability: number;
  perEndpoint: EndpointMetrics[];
  /** ISO-8601 UTC timestamp of when the run started. */
  startTime: string;
  /** ISO-8601 UTC timestamp of when the run finished. */
  endTime: string;
}
