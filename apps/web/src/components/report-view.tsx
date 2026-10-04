"use client";

import { AnalysisReportResponse } from "@/lib/api";
import {
  BarChart3,
  Clock,
  Globe,
  Server,
  TrendingUp,
  Wifi,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  formatNumber,
  formatLatency,
  formatBytes,
  formatPercentile,
  getErrorStatusCodes,
} from "@/lib/api";

interface ReportViewProps {
  report: AnalysisReportResponse;
}

const STATUS_COLORS: Record<string, string> = {
  "2": "text-emerald-400",
  "3": "text-blue-400",
  "4": "text-amber-400",
  "5": "text-rose-400",
  "0": "text-rose-400",
};

function statusCodeColor(code: string): string {
  const first = code.charAt(0);
  return STATUS_COLORS[first] ?? "text-slate-400";
}

function PercentileBar({
  percentiles,
}: {
  percentiles: { label: string; value: number }[];
}) {
  const max = Math.max(...percentiles.map((p) => p.value), 1);
  return (
    <div className="space-y-2">
      {percentiles.map(({ label, value }) => {
        const pct = (value / max) * 100;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="w-8 text-xs font-mono text-slate-400">
              {label}
            </span>
            <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded transition-all"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-20 text-right text-sm font-mono text-slate-300">
              {formatLatency(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function ReportView({ report }: ReportViewProps) {
  const {
    target,
    config,
    totals,
    discovery,
    perEndpoint,
    latency,
    rps,
    errorRate,
    availability,
    totalRequests,
    statusCodes,
    startTime,
    endTime,
    generatedAt,
  } = report;

  const latencyItems = formatPercentile(latency);
  const hasErrors = errorRate > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analysis Complete</h2>
            <p className="text-sm text-slate-500">{target.url}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Report generated at {new Date(generatedAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Server}
          label="Total Requests"
          value={formatNumber(totalRequests)}
          sub={`${totals.requestsIssued} issued`}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Requests/sec"
          value={rps.toFixed(1)}
          sub={`over ${config.durationSeconds}s`}
        />
        <SummaryCard
          icon={BarChart3}
          label="Error Rate"
          value={`${errorRate.toFixed(2)}%`}
          sub={
            hasErrors
              ? `${formatNumber(totals.failedRequests)} failures`
              : "No errors"
          }
        />
        <SummaryCard
          icon={Clock}
          label="Avg Latency"
          value={formatLatency(totals.avgLatencyMs)}
          sub={`p99: ${formatLatency(latency.p99)}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          icon={Globe}
          label="Availability"
          value={`${availability.toFixed(2)}%`}
          sub={
            hasErrors
              ? "Some endpoints returned errors"
              : "All requests succeeded"
          }
        />
        <SummaryCard
          icon={Wifi}
          label="Endpoints Discovered"
          value={String(discovery.endpointsDiscovered)}
          sub={
            discovery.fallbackToRoot
              ? "Fell back to root path"
              : `${perEndpoint.length} endpoints load tested`
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
            Latency Distribution
          </h3>
          <PercentileBar percentiles={latencyItems} />
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
            Status Code Distribution
          </h3>
          <div className="space-y-3">
            {getErrorStatusCodes(statusCodes).map(
              ({ code, count, isError }) => (
                <div key={code} className="flex items-center gap-3">
                  <span
                    className={`w-12 text-sm font-mono font-medium ${statusCodeColor(code)}`}
                  >
                    {code === "0" ? "NET ERR" : code}
                  </span>
                  <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${
                        isError
                          ? "bg-gradient-to-r from-rose-500 to-rose-400"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      }`}
                      style={{
                        width: `${Math.max((count / Math.max(totalRequests, 1)) * 100, 2)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-mono text-slate-300">
                    {formatNumber(count)}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Per-Endpoint Results
          </h3>
          <span className="text-xs text-slate-500">
            {perEndpoint.length} endpoints
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-2 font-medium text-slate-400">
                  Endpoint
                </th>
                <th className="text-left py-3 px-2 font-medium text-slate-400">
                  Source
                </th>
                <th className="text-right py-3 px-2 font-medium text-slate-400">
                  Requests
                </th>
                <th className="right py-3 px-2 font-medium text-slate-400">
                  RPS
                </th>
                <th className="right py-3 px-2 font-medium text-slate-400">
                  Avg
                </th>
                <th className="right py-3 px-2 font-medium text-slate-400">
                  P50
                </th>
                <th className="right py-3 px-2 font-medium text-slate-400">
                  P95
                </th>
                <th className="right py-3 px-2 font-medium text-slate-400">
                  P99
                </th>
                <th className="right py-3 px-2 font-medium text-slate-400">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody>
              {perEndpoint.map((ep) => (
                <tr
                  key={`${ep.method} ${ep.endpoint}`}
                  className="border-b border-slate-900/50"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-14 h-5 text-xs font-mono font-medium rounded bg-slate-800/50 ${
                          ep.method === "GET"
                            ? "text-blue-400"
                            : ep.method === "POST"
                              ? "text-emerald-400"
                              : "text-amber-400"
                        }`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-slate-300 font-mono">
                        {ep.endpoint}
                      </code>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs rounded-full capitalize ${
                        ep.source === "robots"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}
                    >
                      {ep.source}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-300">
                    {formatNumber(ep.count)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-300">
                    {ep.rps.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-400">
                    {formatLatency(ep.avgLatencyMs)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-400">
                    {formatLatency(ep.latency.p50)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-400">
                    {formatLatency(ep.latency.p95)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-400">
                    {formatLatency(ep.latency.p99)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {ep.errorRate > 0 ? (
                      <span className="text-rose-400">
                        {formatNumber(
                          Math.round((ep.count * ep.errorRate) / 100),
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
          Discovery Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  discovery.robotsFound ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span className="text-sm font-medium text-slate-300">
                robots.txt {discovery.robotsFound ? "found" : "not found"}
              </span>
            </div>
            {discovery.crawlDelaySeconds !== null && (
              <p className="text-sm text-slate-500">
                Crawl delay: {discovery.crawlDelaySeconds}s
              </p>
            )}
            {discovery.sitemapsFetched.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Sitemaps fetched:</p>
                <ul className="text-xs text-slate-400 space-y-0.5">
                  {discovery.sitemapsFetched.map((s) => (
                    <li key={s} className="truncate">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            {discovery.fallbackToRoot && (
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-400">
                  No endpoints were discovered from robots.txt or sitemap.xml.
                  Load testing fell back to the site root path.
                </p>
              </div>
            )}
            {discovery.disallowedPaths.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">
                  Disallowed paths ({discovery.disallowedPaths.length}):
                </p>
                <ul className="text-xs font-mono text-slate-400 space-y-0.5">
                  {discovery.disallowedPaths.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {discovery.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Discovery errors:</p>
                <ul className="text-xs text-rose-400 space-y-0.5">
                  {discovery.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Analysis ran for {config.durationSeconds}s with {config.virtualUsers}{" "}
          virtual users at {config.concurrencyPerUser} concurrent request
          {s(config.concurrencyPerUser)} per user ({totals.maxConcurrency} max
          in-flight)
        </span>
        <span>
          {new Date(startTime).toLocaleString()} →{" "}
          {new Date(endTime).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function s(n: number): string {
  return n === 1 ? "" : "s";
}
