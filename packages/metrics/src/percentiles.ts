import { Percentiles } from "@pulsetrace/types";

/**
 * Calculates exact percentiles (p50, p75, p90, p95, p99) from an array of numbers using
 * Nearest Rank / Linear Interpolation method.
 */
export function calculatePercentiles(latencies: number[]): Percentiles {
  if (latencies.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);

  const getPercentile = (p: number): number => {
    if (sorted.length === 1) return sorted[0];
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    p50: Number(getPercentile(50).toFixed(2)),
    p75: Number(getPercentile(75).toFixed(2)),
    p90: Number(getPercentile(90).toFixed(2)),
    p95: Number(getPercentile(95).toFixed(2)),
    p99: Number(getPercentile(99).toFixed(2)),
  };
}
