import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseTrace — Modern API Observability & Performance Monitoring',
  description: 'Real-time telemetry, latency percentiles, error rate tracking, and synthetic health checks for microservices.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
