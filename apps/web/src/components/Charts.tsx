'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface TimeseriesPoint {
  timestamp: string;
  requestCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

export function LatencyChart({ data }: { data: TimeseriesPoint[] }) {
  const formattedData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} unit="ms" />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area type="monotone" dataKey="p50" stroke="#10b981" fill="none" strokeWidth={2} name="p50 (ms)" />
          <Area type="monotone" dataKey="p95" stroke="#3b82f6" fill="url(#p95Grad)" strokeWidth={2} name="p95 (ms)" />
          <Area type="monotone" dataKey="p99" stroke="#f43f5e" fill="url(#p99Grad)" strokeWidth={2} name="p99 (ms)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ErrorRateChart({ data }: { data: TimeseriesPoint[] }) {
  const formattedData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData}>
          <defs>
            <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
          />
          <Area type="monotone" dataKey="errorRate" stroke="#f43f5e" fill="url(#errorGrad)" strokeWidth={2} name="Error Rate (%)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ThroughputChart({ data }: { data: TimeseriesPoint[] }) {
  const formattedData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
          />
          <Bar dataKey="requestCount" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Requests" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
