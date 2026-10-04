import { EndpointInfo, RequestResult } from "@pulsetrace/types";
import { normalizeTargetUrl } from "./discovery.js";

export interface LoadTestConfig {
  durationSeconds?: number;
  virtualUsers?: number;
  concurrencyPerUser?: number;
  maxConcurrency?: number;
  requestTimeoutMs?: number;
  maxTotalRequests?: number;
  userAgent?: string;
  signal?: AbortSignal;
}

export interface ResolvedLoadTestConfig {
  durationSeconds: number;
  virtualUsers: number;
  concurrencyPerUser: number;
  maxConcurrency: number;
  requestTimeoutMs: number;
  maxTotalRequests: number;
  userAgent: string;
}

export interface LoadTestSummary {
  startedAt: string;
  endedAt: string;
  elapsedMs: number;
  requestsIssued: number;
  virtualUsers: number;
  maxConcurrency: number;
  aborted: boolean;
  usedRootFallback: boolean;
}

export interface LoadTestOutcome {
  results: RequestResult[];
  summary: LoadTestSummary;
}

export const LOAD_TEST_DEFAULTS = {
  durationSeconds: 10,
  virtualUsers: 1000,
  concurrencyPerUser: 1,
  maxConcurrency: 1000,
  requestTimeoutMs: 10_000,
  maxTotalRequests: 100_000,
  userAgent: "PulseTrace-LoadTester/1.0",
  maxMeasuredBodyBytes: 262_144,
};

const ROOT_TARGET: Pick<EndpointInfo, "method" | "path"> = {
  method: "GET",
  path: "/",
};

function resolveConfig(config: LoadTestConfig): ResolvedLoadTestConfig {
  const durationSeconds = Math.max(
    1,
    Math.floor(config.durationSeconds ?? LOAD_TEST_DEFAULTS.durationSeconds),
  );
  const virtualUsers = Math.max(
    1,
    Math.floor(config.virtualUsers ?? LOAD_TEST_DEFAULTS.virtualUsers),
  );
  const concurrencyPerUser = Math.max(
    1,
    Math.floor(
      config.concurrencyPerUser ?? LOAD_TEST_DEFAULTS.concurrencyPerUser,
    ),
  );
  const maxConcurrency = Math.max(
    1,
    Math.floor(config.maxConcurrency ?? LOAD_TEST_DEFAULTS.maxConcurrency),
  );

  return {
    durationSeconds,
    virtualUsers,
    concurrencyPerUser,
    maxConcurrency: Math.min(maxConcurrency, virtualUsers) * concurrencyPerUser,
    requestTimeoutMs: Math.max(
      1,
      config.requestTimeoutMs ?? LOAD_TEST_DEFAULTS.requestTimeoutMs,
    ),
    maxTotalRequests: Math.max(
      1,
      config.maxTotalRequests ?? LOAD_TEST_DEFAULTS.maxTotalRequests,
    ),
    userAgent: config.userAgent ?? LOAD_TEST_DEFAULTS.userAgent,
  };
}

async function measureBodySize(
  response: Response,
  maxBytes: number,
): Promise<number> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      await response.body?.cancel().catch(() => undefined);
      return parsed;
    }
  }

  if (response.body === null) return 0;

  const reader = response.body.getReader();
  let size = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;
      if (size >= maxBytes) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  } catch {
    return size;
  }

  return size;
}

export async function fireRequest(
  baseUrl: string,
  endpoint: Pick<EndpointInfo, "method" | "path">,
  config: ResolvedLoadTestConfig,
  signal?: AbortSignal,
): Promise<RequestResult> {
  const url = `${baseUrl}${endpoint.path}`;
  const startedAt = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const onAbort = (): void => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": config.userAgent,
        accept: "*/*",
      },
    });

    const responseSize = await measureBodySize(
      response,
      LOAD_TEST_DEFAULTS.maxMeasuredBodyBytes,
    );

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      timestamp: new Date(startedAt).toISOString(),
      responseSize,
    };
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      statusCode: 0,
      durationMs: Date.now() - startedAt,
      error: isAbort
        ? "timeout"
        : error instanceof Error
          ? error.message
          : String(error),
      timestamp: new Date(startedAt).toISOString(),
      responseSize: 0,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function isFailedResult(result: RequestResult): boolean {
  return (
    result.statusCode === 0 ||
    result.statusCode >= 400 ||
    result.error !== undefined
  );
}

export async function runLoadTestWithSummary(
  baseUrl: string,
  endpoints: EndpointInfo[],
  config: LoadTestConfig = {},
): Promise<LoadTestOutcome> {
  const resolved = resolveConfig(config);
  const target = normalizeTargetUrl(baseUrl);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();

  const targets: Array<Pick<EndpointInfo, "method" | "path">> =
    endpoints.length > 0 ? endpoints : [ROOT_TARGET];
  const results: RequestResult[] = [];
  const deadline = startedAtMs + resolved.durationSeconds * 1000;

  const poolSize = Math.max(
    1,
    Math.min(
      resolved.maxConcurrency,
      resolved.virtualUsers * resolved.concurrencyPerUser,
    ),
  );
  const usersPerWorker = Math.max(
    1,
    Math.floor(resolved.virtualUsers / poolSize),
  );

  let issued = 0;
  let hitRequestCap = false;

  const buildSummary = (): LoadTestSummary => ({
    startedAt,
    endedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAtMs,
    requestsIssued: issued,
    virtualUsers: resolved.virtualUsers,
    maxConcurrency: poolSize,
    aborted: config.signal?.aborted === true || hitRequestCap,
    usedRootFallback: endpoints.length === 0,
  });

  const isStopped = (): boolean =>
    config.signal?.aborted === true ||
    hitRequestCap ||
    results.length >= resolved.maxTotalRequests ||
    Date.now() >= deadline;

  const runVirtualUser = async (): Promise<void> => {
    for (;;) {
      if (isStopped()) return;

      const endpoint = targets[Math.floor(Math.random() * targets.length)];
      issued += 1;

      results.push(
        await fireRequest(target, endpoint, resolved, config.signal),
      );

      if (results.length >= resolved.maxTotalRequests) {
        hitRequestCap = true;
        return;
      }
    }
  };

  const runWorker = async (): Promise<void> => {
    for (let user = 0; user < usersPerWorker; user += 1) {
      if (isStopped()) return;
      await runVirtualUser();
    }
  };

  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));

  return { results, summary: buildSummary() };
}

export async function runLoadTest(
  baseUrl: string,
  endpoints: EndpointInfo[],
  config: LoadTestConfig = {},
): Promise<RequestResult[]> {
  const { results } = await runLoadTestWithSummary(baseUrl, endpoints, config);
  return results;
}
