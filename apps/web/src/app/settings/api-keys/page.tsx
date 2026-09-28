'use client';

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { KeyRound } from 'lucide-react';

export default function SettingsApiKeysPage() {
  return (
    <div className="flex min-h-screen bg-[#090d16]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header title="API Keys Settings" />

        <main className="p-6 space-y-6">
          <div className="glass-card p-6 rounded-xl max-w-3xl space-y-4">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" /> Ingestion Keys Overview
            </h4>
            <p className="text-xs text-slate-400">
              API keys are scoped per project environment. To generate or revoke keys, open a project from the{' '}
              <a href="/projects" className="text-cyan-400 underline">
                Projects Directory
              </a>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
