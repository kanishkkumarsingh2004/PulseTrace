'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AlertTriangle, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AlertRulesPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [rules, setRules] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [metricType, setMetricType] = useState('latency_p95');
  const [operator, setOperator] = useState('gt');
  const [threshold, setThreshold] = useState(500);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadRules(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    const res = await fetchApi('/api/v1/projects');
    if (res.data && res.data.length > 0) {
      setProjects(res.data);
      setSelectedProjectId(res.data[0].id);
    }
  };

  const loadRules = async (projectId: string) => {
    const res = await fetchApi(`/api/v1/projects/${projectId}/alerts`);
    if (res.data) setRules(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchApi(`/api/v1/projects/${selectedProjectId}/alerts`, {
      method: 'POST',
      body: JSON.stringify({
        projectId: selectedProjectId,
        name,
        metricType,
        operator,
        threshold: Number(threshold),
        evaluationWindowMinutes: 5,
        severity: 'critical',
      }),
    });

    if (res.data) {
      setShowModal(false);
      setName('');
      loadRules(selectedProjectId);
    }
  };

  const handleDelete = async (id: string) => {
    await fetchApi(`/api/v1/alerts/${id}`, { method: 'DELETE' });
    loadRules(selectedProjectId);
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Alert Rules & Thresholds" />

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

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg glow-blue flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Alert Rule
            </button>
          </div>

          <div className="glass-card p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Rules ({rules.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Rule Name</th>
                    <th className="py-2.5 px-3">Metric Target</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3">Threshold</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-semibold text-slate-200">{rule.name}</td>
                      <td className="py-3 px-3 text-cyan-400">{rule.metricType}</td>
                      <td className="py-3 px-3 text-slate-400">{rule.operator.toUpperCase()}</td>
                      <td className="py-3 px-3 text-amber-400 font-bold">{rule.threshold}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {rule.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Create Alert Rule</h3>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Rule Descriptor</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="P95 Latency > 500ms"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Metric Target</label>
                    <select
                      value={metricType}
                      onChange={(e) => setMetricType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="latency_p95">Latency P95 (ms)</option>
                      <option value="latency_p99">Latency P99 (ms)</option>
                      <option value="error_rate">Error Rate (%)</option>
                      <option value="throughput_rps">Throughput (RPS)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Operator</label>
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="gt">Greater Than (&gt;)</option>
                        <option value="gte">Greater or Equal (&ge;)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Threshold</label>
                      <input
                        type="number"
                        required
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold glass-card text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg glow-blue"
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
