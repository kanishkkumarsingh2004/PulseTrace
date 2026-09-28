'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Route, Clock, ShieldAlert, Activity } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function EndpointDetailPage() {
  const { id } = useParams() as { id: string };
  const [endpoint, setEndpoint] = useState<any>(null);

  useEffect(() => {
    loadEndpoint();
  }, [id]);

  const loadEndpoint = async () => {
    const res = await fetchApi(`/api/v1/endpoints/${id}`);
    if (res.data) setEndpoint(res.data);
  };

  if (!endpoint) return null;

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title={`Endpoint: ${endpoint.route}`} />

        <main className="p-6 space-y-6">
          <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-sm font-mono">
                {endpoint.method}
              </span>
              <div>
                <h3 className="text-xl font-bold text-white font-mono">{endpoint.route}</h3>
                <p className="text-xs text-slate-400">Service: {endpoint.service?.name}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
