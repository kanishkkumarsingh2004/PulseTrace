import {
  AnalysisConfig,
  AnalysisReport,
  EndpointInfo,
  RequestResult,
} from "@pulsetrace/types";
import { buildAnalysisReport as buildMetricsReport } from "@pulsetrace/metrics";
import crypto from "crypto";
import { DiscoveryResult } from "./discovery.js";
import { isFailedResult, LoadTestSummary } from "./loadtester.js";

export interface DiscoverySummary {
  robotsFound: boolean;
  crawlDelaySeconds: number | null;
  sitemaps: string[];
  sitemapsFetched: string[];
  disallowedPaths: string[];
  blockedEndpoints: EndpointInfo[];
  endpointsDiscovered: number;
  endpointsBlocked: number;
  fallbackToRoot: boolean;
  errors: string[];
}

export interface AnalysisTotals {
  requestsIssued: number;
  maxConcurrency: number;
  elapsedMs: number;
  aborted: boolean;
  usedRootFallback: boolean;
  successfulRequests: number;
  failedRequests: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  totalResponseBytes: number;
  avgResponseBytes: number;
}

export interface RunAnalysisReport extends AnalysisReport {
  id: string;
  generatedAt: string;
  target: {
    input: string;
    url: string;
    origin: string;
  };
  config: AnalysisConfig;
  discovery: DiscoverySummary;
  totals: AnalysisTotals;
}

export interface BuildReportInput {
  results: RequestResult[];
  discovery: DiscoveryResult;
  summary: LoadTestSummary;
  durationSeconds: number;
  virtualUsers: number;
  concurrencyPerUser: number;
}

interface Rollup {
  failedRequests: number;
  totalResponseBytes: number;
  latencySum: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

let latestReport: RunAnalysisReport | null = null;

function rollup(results: RequestResult[]): Rollup {
  const totals: Rollup = {
    failedRequests: 0,
    totalResponseBytes: 0,
    latencySum: 0,
    minLatencyMs: 0,
    maxLatencyMs: 0,
  };

  for (const [index, result] of results.entries()) {
    if (isFailedResult(result)) totals.failedRequests += 1;

    totals.totalResponseBytes += result.responseSize;
    totals.latencySum += result.durationMs;

    if (index === 0) {
      totals.minLatencyMs = result.durationMs;
      totals.maxLatencyMs = result.durationMs;
    } else {
      if (result.durationMs < totals.minLatencyMs)
        totals.minLatencyMs = result.durationMs;
      if (result.durationMs > totals.maxLatencyMs)
        totals.maxLatencyMs = result.durationMs;
    }
  }

  return totals;
}

export function buildAnalysisReport(
  input: BuildReportInput,
): RunAnalysisReport {
  const { results, discovery, summary } = input;

  const analysisConfig: AnalysisConfig = {
    targetUrl: discovery.baseUrl,
    durationSeconds: input.durationSeconds,
    virtualUsers: input.virtualUsers,
    concurrencyPerUser: input.concurrencyPerUser,
  };

  const base = buildMetricsReport(analysisConfig, discovery.endpoints, results);
  const totals = rollup(results);

  return {
    ...base,
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    target: {
      input: discovery.input,
      url: discovery.baseUrl,
      origin: discovery.origin,
    },
    config: analysisConfig,
    discovery: {
      robotsFound: discovery.robots.found,
      crawlDelaySeconds: discovery.robots.crawlDelaySeconds,
      sitemaps: discovery.robots.sitemaps,
      sitemapsFetched: discovery.sitemapsFetched,
      disallowedPaths: discovery.robots.disallowedPaths,
      blockedEndpoints: discovery.blockedEndpoints,
      endpointsDiscovered: discovery.endpoints.length,
      endpointsBlocked: discovery.blockedEndpoints.length,
      fallbackToRoot: discovery.fallbackToRoot,
      errors: discovery.errors,
    },
    totals: {
      requestsIssued: summary.requestsIssued,
      maxConcurrency: summary.maxConcurrency,
      elapsedMs: summary.elapsedMs,
      aborted: summary.aborted,
      usedRootFallback: summary.usedRootFallback,
      successfulRequests: results.length - totals.failedRequests,
      failedRequests: totals.failedRequests,
      minLatencyMs: totals.minLatencyMs,
      maxLatencyMs: totals.maxLatencyMs,
      avgLatencyMs:
        results.length > 0
          ? Number((totals.latencySum / results.length).toFixed(2))
          : 0,
      totalResponseBytes: totals.totalResponseBytes,
      avgResponseBytes:
        results.length > 0
          ? Math.round(totals.totalResponseBytes / results.length)
          : 0,
    },
  };
}

export function setLatestReport(report: RunAnalysisReport): void {
  latestReport = report;
}

export function getLatestReport(): RunAnalysisReport | null {
  return latestReport;
}

export function clearLatestReport(): void {
  latestReport = null;
}
