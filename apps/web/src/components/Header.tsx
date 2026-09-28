'use client';

import { useRouter } from 'next/navigation';
import { Bell, User, LogOut } from 'lucide-react';

export function Header({ title }: { title: string }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('pt_token');
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800 glass-panel px-6 flex items-center justify-between sticky top-0 z-10">
      <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Production
        </div>

        {/* Notification Bell */}
        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <Bell className="w-5 h-5" />
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200">
            <User className="w-4 h-4" />
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
