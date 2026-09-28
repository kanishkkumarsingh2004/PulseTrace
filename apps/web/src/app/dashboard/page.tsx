'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { LatencyChart, ErrorRateChart, ThroughputChart } from '@/components/Charts';
import { LiveFeedWidget } from '@/components/LiveFeedWidget';
import { Activity, Clock, ShieldAlert, Zap, Layers, Server } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadMetrics(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    const res = await fetchApi('/api/v1/projects');
    if (res.data && res.data.length > 0) {
      setProjects(res.data);
      setSelectedProjectId(res.data[0].id);
    } else {
      setLoading(false);
    }
  };

  const loadMetrics = async (projectId: string) => {
    setLoading(true);

    const [sumRes, tsRes, epRes] = await Promise.all([
      fetchApi(`/api/v1/metrics/summary?projectId=${projectId}`),
      fetchApi(`/api/v1/metrics/timeseries?projectId=${projectId}`),
      fetchApi(`/api/v1/metrics/endpoints?projectId=${projectId}`),
    ]);

    if (sumRes.data) setSummary(sumRes.data);
    if (tsRes.data) setTimeseries(tsRes.data);
    if (epRes.data) setEndpoints(epRes.data);

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Global Telemetry Overview" />

        <main className="p-6 space-y-6">
          {/* Project Selector Bar */}
          <div className="flex items-center justify-between glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">Active Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedProjectId && loadMetrics(selectedProjectId)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg glass-card hover:bg-slate-800 text-slate-300 transition"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Requests"
              value={summary?.requestCount?.toLocaleString() || '0'}
              subtitle="Aggregated across microservices"
              icon={Activity}
              color="blue"
            />
            <MetricCard
              title="Throughput (RPS)"
              value={`${summary?.rps || 0} req/s`}
              subtitle="Requests per second"
              icon={Zap}
              color="emerald"
            />
            <MetricCard
              title="Latency P95"
              value={`${summary?.latency?.p95 || 0} ms`}
              subtitle="95th percentile response time"
              icon={Clock}
              color="purple"
            />
            <MetricCard
              title="Error Rate"
              value={`${summary?.errorRate || 0}%`}
              subtitle="4xx and 5xx HTTP responses"
              icon={ShieldAlert}
              color={summary?.errorRate > 1 ? 'rose' : 'emerald'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5 rounded-xl">
              <h4 className="font-semibold text-sm text-white mb-4">Latency Percentiles (p50 / p95 / p99)</h4>
              <LatencyChart data={timeseries} />
            </div>

            <div className="glass-card p-5 rounded-xl">
              <h4 className="font-semibold text-sm text-white mb-4">Error Rate (%)</h4>
              <ErrorRateChart data={timeseries} />
            </div>
          </div>

          {/* Leaderboard & Real-Time Feed Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Endpoints Table */}
            <div className="lg:col-span-2 glass-card p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-white">Endpoint Performance Leaderboard</h4>
                <span className="text-xs text-slate-400 font-mono">{endpoints.length} active routes</span>
              </div>

              {endpoints.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No telemetry endpoints recorded yet. Start sending telemetry batches!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Service</th>
                        <th className="py-2.5 px-3">Method & Route</th>
                        <th className="py-2.5 px-3">Requests</th>
                        <th className="py-2.5 px-3">P95 Latency</th>
                        <th className="py-2.5 px-3">Error Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {endpoints.map((ep) => (
                        <tr key={ep.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-3 text-cyan-400 font-semibold">{ep.serviceName}</td>
                          <td className="py-3 px-3 text-slate-200">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold mr-2">
                              {ep.method}
                            </span>
                            {ep.route}
                          </td>
                          <td className="py-3 px-3 text-slate-300">{ep.totalRequests}</td>
                          <td className="py-3 px-3 text-blue-400">{ep.p95LatencyMs} ms</td>
                          <td
                            className={`py-3 px-3 font-semibold ${
                              ep.errorRate > 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {ep.errorRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live WebSocket Feed */}
            <div className="lg:col-span-1">
              <LiveFeedWidget />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
