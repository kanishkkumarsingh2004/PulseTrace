'use client';

import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';

interface LiveMetric {
  serviceName: string;
  route: string;
  requestCount: number;
  errorRate: number;
  p95: number;
  timestamp: string;
}

export function LiveFeedWidget() {
  const [feed, setFeed] = useState<LiveMetric[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws/metrics';
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'METRIC_UPDATE') {
            setFeed((prev) => [data, ...prev.slice(0, 9)]);
          }
        } catch {
          // Ignore
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (socket) socket.close();
    };
  }, []);

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <h4 className="font-semibold text-sm text-white">Live Telemetry Stream</h4>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">WS Pub/Sub</span>
      </div>

      {feed.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Waiting for live telemetry events...
        </div>
      ) : (
        <div className="space-y-2">
          {feed.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-cyan-400 font-semibold">{item.serviceName}</span>
                <span className="text-slate-400 truncate">{item.route}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-blue-400">p95: {item.p95}ms</span>
                <span className={item.errorRate > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {item.errorRate}% err
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
