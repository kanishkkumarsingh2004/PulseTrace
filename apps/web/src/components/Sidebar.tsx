'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  FolderKanban,
  Server,
  AlertTriangle,
  Siren,
  HeartPulse,
  BarChart3,
  Settings,
  KeyRound,
  Users,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Incidents', href: '/incidents', icon: Siren },
  { name: 'Alert Rules', href: '/alerts', icon: AlertTriangle },
  { name: 'Health Checks', href: '/health-checks', icon: HeartPulse },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const settingsNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'API Keys', href: '/settings/api-keys', icon: KeyRound },
  { name: 'Team', href: '/settings/team', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel min-h-screen flex flex-col justify-between border-r border-slate-800 p-4 shrink-0">
      <div>
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center text-white shadow-lg glow-blue">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide">PulseTrace</h1>
            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Observability</p>
          </div>
        </Link>

        {/* Main Nav */}
        <nav className="space-y-1">
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Overview</div>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Settings Nav */}
        <div className="mt-8 space-y-1">
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace</div>
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Live System Status Indicator */}
      <div className="glass-card p-3 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-slate-300 font-medium">Ingestion Online</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
