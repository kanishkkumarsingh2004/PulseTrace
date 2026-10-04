"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  Send,
  Loader2,
  Zap,
  Users,
  Timer,
} from "lucide-react";
import ReportView from "@/components/report-view";
import {
  analyzeUrl,
  fetchReport,
  checkHealth,
  AnalysisReportResponse,
} from "@/lib/api";

const DEFAULT_DURATION = 10;
const DEFAULT_VIRTUAL_USERS = 1000;
const DEFAULT_CONCURRENCY = 1;

export default function AnalysisPage() {
  const [url, setUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION);
  const [virtualUsers, setVirtualUsers] = useState(DEFAULT_VIRTUAL_USERS);
  const [concurrencyPerUser, setConcurrencyPerUser] =
    useState(DEFAULT_CONCURRENCY);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<
    "idle" | "checking" | "ok" | "error"
  >("idle");

  useEffect(() => {
    const probe = async () => {
      setApiStatus("checking");
      const result = await checkHealth();
      if (result.status === "ok") {
        setApiStatus("ok");
      } else {
        setApiStatus("error");
      }
    };
    probe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReport(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL to analyze.");
      return;
    }

    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    setIsAnalyzing(true);

    try {
      const result = await analyzeUrl({
        url: withScheme,
        durationSeconds,
        virtualUsers,
        concurrencyPerUser,
      });

      if (result.error) {
        setError(
          `${result.error.message}${result.error.requestId ? ` (${result.error.code})` : ""}`,
        );
      } else if (result.data) {
        setReport(result.data);
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchLatestReport = async () => {
    setError(null);
    const result = await fetchReport();
    if (result.error) {
      setError(result.error.message);
    } else if (result.data) {
      setReport(result.data);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <header className="max-w-4xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center text-white shadow-lg">
            <Activity className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            PulseTrace
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${apiStatus === "ok"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : apiStatus === "error"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${apiStatus === "ok"
                  ? "bg-emerald-400"
                  : apiStatus === "error"
                    ? "bg-rose-400"
                    : "bg-slate-400"
                }`}
            />
            {apiStatus === "ok"
              ? "API Online"
              : apiStatus === "error"
                ? "API Offline"
                : "Checking..."}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-6 flex-1">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            URL-Based Website Performance Analysis
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Enter any URL. PulseTrace discovers endpoints via robots.txt and
            sitemap.xml, simulates 1000 virtual users for a timed load test, and
            returns a full performance report with latency percentiles, RPS, and
            error-rate analytics.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isAnalyzing}
              className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition"
              required
            />
            <button
              type="submit"
              disabled={isAnalyzing || !url.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-600 text-white font-semibold rounded-xl shadow-lg glow-blue transition flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
              <Timer className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={durationSeconds}
                  onChange={(e) =>
                    setDurationSeconds(
                      Math.max(
                        1,
                        Math.min(300, parseInt(e.target.value, 10) || 10),
                      ),
                    )
                  }
                  disabled={isAnalyzing}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
              <Users className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Virtual Users
                </label>
                <input
                  type="number"
                  min={1}
                  max={50000000}
                  value={virtualUsers}
                  onChange={(e) =>
                    setVirtualUsers(
                      Math.max(
                        1,
                        Math.min(50000000, parseInt(e.target.value, 10) || 1000),
                      ),
                    )
                  }
                  disabled={isAnalyzing}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
              <Zap className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Concurrency / User
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={concurrencyPerUser}
                  onChange={(e) =>
                    setConcurrencyPerUser(
                      Math.max(
                        1,
                        Math.min(10, parseInt(e.target.value, 10) || 1),
                      ),
                    )
                  }
                  disabled={isAnalyzing}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {isAnalyzing && (
            <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-400">
                  Analysis in progress
                </p>
                <p className="text-sm text-slate-400">
                  Discovering endpoints and simulating {virtualUsers} virtual
                  users for {durationSeconds}s...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 font-medium">Error</p>
              <p className="text-sm text-slate-300 mt-1">{error}</p>
            </div>
          )}
        </form>

        {report && <ReportView report={report} />}

        {!report && !isAnalyzing && !error && apiStatus === "ok" && (
          <div className="text-center py-12 text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              Enter a URL and click &quot;Analyze&quot; to get started.
            </p>
            <button
              onClick={handleFetchLatestReport}
              className="mt-3 text-sm text-slate-400 hover:text-slate-200 underline"
            >
              Fetch latest report
            </button>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto w-full px-6 py-6 border-t border-slate-800 text-xs text-slate-500">
        <p>
          PulseTrace issues read-only HTTP requests against the URL you provide.
          Only point it at targets you are authorized to test. Results are
          in-memory only and never persisted.
        </p>
      </footer>
    </div>
  );
}
