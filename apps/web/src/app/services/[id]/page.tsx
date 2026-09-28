'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { LatencyChart, ErrorRateChart, ThroughputChart } from '@/components/Charts';
import { Server, Activity, Clock, ShieldAlert, Zap, Route } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ServiceDashboardPage() {
  const { id } = useParams() as { id: string };
  const [service, setService] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);

  useEffect(() => {
    loadService();
  }, [id]);

  const loadService = async () => {
    const res = await fetchApi(`/api/v1/services/${id}`);
    if (res.data) {
      setService(res.data);
      loadServiceMetrics(res.data.projectId, res.data.id);
    }
  };

  const loadServiceMetrics = async (projectId: string, serviceId: string) => {
    const [sumRes, tsRes] = await Promise.all([
      fetchApi(`/api/v1/metrics/summary?projectId=${projectId}&serviceId=${serviceId}`),
      fetchApi(`/api/v1/metrics/timeseries?projectId=${projectId}&serviceId=${serviceId}`),
    ]);

    if (sumRes.data) setSummary(sumRes.data);
    if (tsRes.data) setTimeseries(tsRes.data);
  };

  if (!service) return null;

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title={`Service: ${service.name}`} />

        <main className="p-6 space-y-6">
          {/* Service Banner */}
          <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{service.name}</h3>
                  <p className="text-xs text-slate-400">{service.description || 'Microservice Telemetry Dashboard'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>Project: <strong className="text-white">{service.project?.name}</strong></span>
              <span>Endpoints: <strong className="text-cyan-400">{service.endpoints?.length || 0}</strong></span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Requests"
              value={summary?.requestCount?.toLocaleString() || '0'}
              subtitle="Service total"
              icon={Activity}
              color="blue"
            />
            <MetricCard
              title="RPS"
              value={`${summary?.rps || 0} req/s`}
              subtitle="Current rate"
              icon={Zap}
              color="emerald"
            />
            <MetricCard
              title="P95 Latency"
              value={`${summary?.latency?.p95 || 0} ms`}
              subtitle="95th percentile"
              icon={Clock}
              color="purple"
            />
            <MetricCard
              title="Error Rate"
              value={`${summary?.errorRate || 0}%`}
              subtitle="Failed responses"
              icon={ShieldAlert}
              color={summary?.errorRate > 1 ? 'rose' : 'emerald'}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5 rounded-xl">
              <h4 className="font-semibold text-sm text-white mb-4">Latency Percentiles (p50 / p95 / p99)</h4>
              <LatencyChart data={timeseries} />
            </div>

            <div className="glass-card p-5 rounded-xl">
              <h4 className="font-semibold text-sm text-white mb-4">Request Throughput</h4>
              <ThroughputChart data={timeseries} />
            </div>
          </div>

          {/* Endpoints Registry Table */}
          <div className="glass-card p-5 rounded-xl space-y-4">
            <h4 className="font-semibold text-sm text-white flex items-center gap-2">
              <Route className="w-4 h-4 text-cyan-400" /> Service Routes ({service.endpoints?.length || 0})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Normalized Route Template</th>
                    <th className="py-2.5 px-3">Raw Path Sample</th>
                    <th className="py-2.5 px-3">First Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {service.endpoints?.map((ep: any) => (
                    <tr key={ep.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-cyan-300 font-semibold">{ep.route}</td>
                      <td className="py-3 px-3 text-slate-400">{ep.path}</td>
                      <td className="py-3 px-3 text-slate-500">{new Date(ep.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
