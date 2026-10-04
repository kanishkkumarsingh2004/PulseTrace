import type {
  AnalysisConfig,
  AnalysisReport,
  EndpointMetrics,
  Percentiles,
} from "@pulsetrace/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AnalysisRequest {
  url: string;
  durationSeconds?: number;
  virtualUsers?: number;
  concurrencyPerUser?: number;
}

export interface AnalysisReportResponse extends AnalysisReport {
  id: string;
  generatedAt: string;
  target: { input: string; url: string; origin: string };
  config: AnalysisConfig;
  discovery: {
    robotsFound: boolean;
    crawlDelaySeconds: number | null;
    sitemaps: string[];
    sitemapsFetched: string[];
    disallowedPaths: string[];
    endpointsDiscovered: number;
    endpointsBlocked: number;
    fallbackToRoot: boolean;
    errors: string[];
  };
  totals: {
    requestsIssued: number;
    maxConcurrency: number;
    elapsedMs: number;
    aborted: boolean;
    successfulRequests: number;
    failedRequests: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    avgLatencyMs: number;
    totalResponseBytes: number;
    avgResponseBytes: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export async function analyzeUrl(
  payload: AnalysisRequest,
): Promise<{ data?: AnalysisReportResponse; error?: ApiError }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (!res.ok) {
      return {
        error: {
          code: body.error?.code || `HTTP_${res.status}`,
          message: body.error?.message || "Request failed",
          details: body.error?.details,
          requestId: body.error?.requestId,
        },
      };
    }

    return { data: body.data };
  } catch (err: any) {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Network connection failure",
      },
    };
  }
}

export async function fetchReport(): Promise<{
  data?: AnalysisReportResponse;
  error?: ApiError;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/report`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = await res.json();

    if (!res.ok) {
      return {
        error: {
          code: body.error?.code || `HTTP_${res.status}`,
          message: body.error?.message || "Request failed",
          requestId: body.error?.requestId,
        },
      };
    }

    if (!body.data) {
      return {
        error: {
          code: "NO_REPORT",
          message: "No analysis report available. Run an analysis first.",
        },
      };
    }

    return { data: body.data };
  } catch (err: any) {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Network connection failure",
      },
    };
  }
}

export async function checkHealth(): Promise<{
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return await res.json();
  } catch {
    return { status: "error", timestamp: new Date().toISOString(), uptime: 0 };
  }
}

export function formatPercentile(
  p: Percentiles,
): { label: string; value: number }[] {
  return [
    { label: "p50", value: p.p50 },
    { label: "p75", value: p.p75 },
    { label: "p90", value: p.p90 },
    { label: "p95", value: p.p95 },
    { label: "p99", value: p.p99 },
  ];
}

export function formatLatency(ms: number): string {
  if (ms < 1) return `${Math.round(ms * 1000)}μs`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function getErrorStatusCodes(
  metrics: EndpointMetrics["statusCodes"],
): { code: string; count: number; isError: boolean }[] {
  return Object.entries(metrics)
    .map(([code, count]) => ({
      code,
      count,
      isError: code === "0" || parseInt(code, 10) >= 400,
    }))
    .sort((a, b) => {
      if (a.isError !== b.isError) return a.isError ? 1 : -1;
      return parseInt(a.code, 10) - parseInt(b.code, 10);
    });
}
