'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { HeartPulse, Plus, ExternalLink, Activity } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function HealthChecksPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [checks, setChecks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadChecks(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    const res = await fetchApi('/api/v1/projects');
    if (res.data && res.data.length > 0) {
      setProjects(res.data);
      setSelectedProjectId(res.data[0].id);
    }
  };

  const loadChecks = async (projectId: string) => {
    const res = await fetchApi(`/api/v1/projects/${projectId}/health-checks`);
    if (res.data) setChecks(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchApi(`/api/v1/projects/${selectedProjectId}/health-checks`, {
      method: 'POST',
      body: JSON.stringify({
        projectId: selectedProjectId,
        name,
        url,
        method: 'GET',
        intervalSeconds: Number(intervalSeconds),
        timeoutMs: 5000,
        expectedStatus: 200,
      }),
    });

    if (res.data) {
      setShowModal(false);
      setName('');
      setUrl('');
      loadChecks(selectedProjectId);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Synthetic Uptime & Health Checks" />

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
              <Plus className="w-4 h-4" /> Add Synthetic Health Check
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checks.map((chk) => (
              <div key={chk.id} className="glass-card p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-emerald-400" />
                    <h5 className="font-bold text-sm text-white">{chk.name}</h5>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      chk.status === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {chk.status}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-400 flex items-center gap-1 truncate">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <a href={chk.url} target="_blank" rel="noreferrer" className="hover:underline truncate">
                    {chk.url}
                  </a>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Interval: {chk.intervalSeconds}s</span>
                  <span>Timeout: {chk.timeoutMs}ms</span>
                </div>
              </div>
            ))}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Add Synthetic Health Check</h3>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Check Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Auth Service Health Endpoint"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Target URL</label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="http://localhost:4000/health"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Poll Interval (seconds)</label>
                    <input
                      type="number"
                      min={10}
                      max={3600}
                      value={intervalSeconds}
                      onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
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
                      Save Check
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
