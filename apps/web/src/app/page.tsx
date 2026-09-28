import Link from 'next/link';
import { Activity, ShieldCheck, Zap, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center text-white shadow-lg glow-blue">
            <Activity className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">PulseTrace</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg glow-blue flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          Next-Gen API Observability Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-white leading-tight">
          Real-Time Microservice Telemetry & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">Latency Intelligence</span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl">
          Zero-overhead HTTP tracing, statistical percentiles (p50/p95/p99), synthetic health monitoring, and automated incident state machines.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white transition shadow-xl glow-blue flex items-center gap-2 text-base"
          >
            Explore Demo Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl font-semibold glass-card hover:bg-slate-800 text-slate-200 transition text-base"
          >
            Sign In to Workspace
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-5xl">
          <div className="glass-card p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Fire & Forget Ingestion</h3>
            <p className="text-sm text-slate-400">
              Non-blocking Node.js SDK buffers telemetry and returns HTTP 202 immediately to guarantee zero performance impact on monitored apps.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Statistical Percentiles</h3>
            <p className="text-sm text-slate-400">
              Accurate p50, p75, p90, p95, and p99 latency aggregation across custom time boundaries without arbitrary multipliers.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Incident Automation</h3>
            <p className="text-sm text-slate-400">
              Rule evaluation state machine creates incidents upon threshold breach and auto-resolves when metrics recover.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 relative z-10">
        <p>© 2026 PulseTrace Observability Systems Inc. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>API Docs</span>
        </div>
      </footer>
    </div>
  );
}
