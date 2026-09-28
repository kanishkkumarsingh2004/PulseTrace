'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FolderKanban, Plus, Server, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const res = await fetchApi('/api/v1/projects');
    if (res.data) setProjects(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetchApi('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });

    setLoading(false);

    if (res.data) {
      setShowModal(false);
      setName('');
      setDescription('');
      loadProjects();
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Observability Projects" />

        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Projects Directory</h3>
              <p className="text-xs text-slate-400">Manage environment clusters and service registries</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg glow-blue flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Create Project
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <div key={p.id} className="glass-card p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      ID: {p.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{p.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{p.description || 'No description provided.'}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4 text-center">
                  <div>
                    <span className="block text-base font-bold text-white">{p._count?.services || 0}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Services</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-cyan-400">{p._count?.apiKeys || 0}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">API Keys</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-amber-400">{p._count?.alertRules || 0}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Rules</span>
                  </div>
                </div>

                <Link
                  href={`/projects/${p.id}`}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white transition flex items-center justify-center gap-2"
                >
                  Manage Project <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Create Observability Project</h3>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Project Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Payments Microservices"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Telemetry pipeline for checkout and billing services"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold glass-card text-slate-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg glow-blue"
                    >
                      {loading ? 'Creating...' : 'Create Project'}
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
