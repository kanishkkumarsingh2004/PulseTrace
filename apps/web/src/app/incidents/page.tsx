'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Siren, CheckCircle, ShieldAlert, Clock } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function IncidentsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadIncidents(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    const res = await fetchApi('/api/v1/projects');
    if (res.data && res.data.length > 0) {
      setProjects(res.data);
      setSelectedProjectId(res.data[0].id);
    }
  };

  const loadIncidents = async (projectId: string) => {
    const res = await fetchApi(`/api/v1/projects/${projectId}/incidents`);
    if (res.data) setIncidents(res.data);
  };

  const handleAcknowledge = async (id: string) => {
    await fetchApi(`/api/v1/incidents/${id}/acknowledge`, { method: 'POST' });
    loadIncidents(selectedProjectId);
  };

  const handleResolve = async (id: string) => {
    await fetchApi(`/api/v1/incidents/${id}/resolve`, { method: 'POST' });
    loadIncidents(selectedProjectId);
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Incidents & Breach Timeline" />

        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
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

          <div className="glass-card p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Siren className="w-4 h-4 text-rose-400" /> Incident Timeline ({incidents.length})
            </h4>

            {incidents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No incidents triggered. All telemetry rules operating within normal boundaries!
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.status === 'OPEN'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                              : inc.status === 'ACKNOWLEDGED'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {inc.status}
                        </span>
                        <h5 className="font-bold text-sm text-white">{inc.rule?.name}</h5>
                      </div>

                      <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
                        <span>
                          Target: <strong className="text-cyan-400">{inc.metricType}</strong>
                        </span>
                        <span>
                          Trigger Value: <strong className="text-rose-400">{inc.triggerValue}</strong> (Threshold:{' '}
                          {inc.threshold})
                        </span>
                        <span>Time: {new Date(inc.triggeredAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inc.status === 'OPEN' && (
                        <button
                          onClick={() => handleAcknowledge(inc.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/30 transition"
                        >
                          Acknowledge
                        </button>
                      )}
                      {inc.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleResolve(inc.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
