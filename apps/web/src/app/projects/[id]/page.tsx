'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Server, KeyRound, Plus, ShieldCheck, ArrowRight, Copy, Check } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const [project, setProject] = useState<any>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    const res = await fetchApi(`/api/v1/projects/${id}`);
    if (res.data) setProject(res.data);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetchApi(`/api/v1/projects/${id}/keys`, {
      method: 'POST',
      body: JSON.stringify({ name: keyName, environment: 'production' }),
    });

    setLoading(false);

    if (res.data?.rawApiKey) {
      setNewRawKey(res.data.rawApiKey);
      loadProject();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!project) return null;

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title={`Project: ${project.name}`} />

        <main className="p-6 space-y-6">
          {/* Project Details Banner */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white">{project.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
                  {project.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{project.description || 'No description provided.'}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setNewRawKey(null);
                  setShowKeyModal(true);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg glow-blue flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" /> Generate Ingestion API Key
              </button>
            </div>
          </div>

          {/* Registered Microservices */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" /> Monitored Services ({project.services?.length || 0})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.services?.map((svc: any) => (
                <div key={svc.id} className="glass-card p-5 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-100">{svc.name}</h5>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{svc.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
                    <span>{svc.endpoints?.length || 0} Routes</span>
                    <Link
                      href={`/services/${svc.id}`}
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Dashboard <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingestion API Keys Table */}
          <div className="glass-card p-5 rounded-xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" /> Active API Keys
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Key Name</th>
                    <th className="py-2.5 px-3">Prefix</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {project.apiKeys?.map((k: any) => (
                    <tr key={k.id}>
                      <td className="py-3 px-3 text-slate-200 font-semibold">{k.name}</td>
                      <td className="py-3 px-3 text-cyan-400">{k.keyPrefix}****************</td>
                      <td className="py-3 px-3 text-slate-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            k.isRevoked ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {k.isRevoked ? 'REVOKED' : 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* API Key Modal */}
          {showKeyModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Generate Telemetry API Key</h3>

                {!newRawKey ? (
                  <form onSubmit={handleCreateKey} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Key Name / Descriptor</label>
                      <input
                        type="text"
                        required
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="Production Node SDK Key"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowKeyModal(false)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold glass-card text-slate-400 hover:text-white transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg glow-blue"
                      >
                        {loading ? 'Generating...' : 'Generate Key'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                      ⚠️ <strong>Save this secret key now!</strong> It will never be displayed again.
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300 flex items-center justify-between break-all">
                      <span>{newRawKey}</span>
                      <button
                        onClick={() => copyToClipboard(newRawKey)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300 ml-2"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={() => setShowKeyModal(false)}
                      className="w-full py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
