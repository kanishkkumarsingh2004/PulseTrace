'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { LatencyChart, ErrorRateChart, ThroughputChart } from '@/components/Charts';
import { BarChart3, Filter } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [timeseries, setTimeseries] = useState<any[]>([]);

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
    }
  };

  const loadMetrics = async (projectId: string) => {
    const res = await fetchApi(`/api/v1/metrics/timeseries?projectId=${projectId}`);
    if (res.data) setTimeseries(res.data);
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Metrics & Telemetry Explorer" />

        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="glass-card p-6 rounded-xl space-y-4">
              <h4 className="font-bold text-sm text-white">Latency Percentiles Explorer (p50 / p95 / p99)</h4>
              <LatencyChart data={timeseries} />
            </div>

            <div className="glass-card p-6 rounded-xl space-y-4">
              <h4 className="font-bold text-sm text-white">Throughput & Request Density</h4>
              <ThroughputChart data={timeseries} />
            </div>

            <div className="glass-card p-6 rounded-xl space-y-4">
              <h4 className="font-bold text-sm text-white">Error Rate Trend (%)</h4>
              <ErrorRateChart data={timeseries} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
