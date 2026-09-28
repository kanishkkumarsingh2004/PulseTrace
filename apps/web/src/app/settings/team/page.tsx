'use client';

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Users, UserPlus } from 'lucide-react';

export default function SettingsTeamPage() {
  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="Team Members & Access" />

        <main className="p-6 space-y-6">
          <div className="glass-card p-6 rounded-xl max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Organization Members
              </h4>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Invite Member
              </button>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 text-xs font-mono">
                <div>
                  <div className="font-bold text-white">PulseTrace Admin</div>
                  <div className="text-slate-500">admin@pulsetrace.io</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  ADMIN
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
