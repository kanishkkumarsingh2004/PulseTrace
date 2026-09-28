'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Settings, Shield, User } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const res = await fetchApi('/api/v1/auth/me');
    if (res.data) setUser(res.data);
  };

  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Workspace Settings" />

        <main className="p-6 space-y-6">
          <div className="glass-card p-6 rounded-xl max-w-2xl space-y-6">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" /> Account Profile
            </h4>

            {user && (
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <label className="block text-xs text-slate-500 uppercase">Name</label>
                  <div className="p-2.5 rounded bg-slate-900 text-slate-200 border border-slate-800 mt-1">
                    {user.name}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 uppercase">Email Address</label>
                  <div className="p-2.5 rounded bg-slate-900 text-slate-200 border border-slate-800 mt-1">
                    {user.email}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 uppercase">Role</label>
                  <div className="p-2.5 rounded bg-slate-900 text-cyan-400 font-bold border border-slate-800 mt-1">
                    {user.role}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
