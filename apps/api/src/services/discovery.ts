import { EndpointInfo, EndpointSource, HttpMethod } from "@pulsetrace/types";

export interface RobotsInfo {
  found: boolean;
  crawlDelaySeconds: number | null;
  sitemaps: string[];
  disallowedPaths: string[];
  allowedPaths: string[];
  userAgents: string[];
}

export interface DiscoveryResult {
  input: string;
  baseUrl: string;
  origin: string;
  discoveredAt: string;
  robots: RobotsInfo;
  sitemapsFetched: string[];
  endpoints: EndpointInfo[];
  blockedEndpoints: EndpointInfo[];
  fallbackToRoot: boolean;
  errors: string[];
}

export interface DiscoveryOptions {
  timeoutMs?: number;
  userAgent?: string;
  maxSitemaps?: number;
  maxUrlsPerSitemap?: number;
  maxEndpoints?: number;
  signal?: AbortSignal;
}

export interface FetchTextResult {
  ok: boolean;
  status: number;
  body: string | null;
  contentType: string | null;
}

export const DISCOVERY_DEFAULTS = {
  timeoutMs: 10_000,
  userAgent: "PulseTrace-Discovery/1.0",
  maxSitemaps: 10,
  maxUrlsPerSitemap: 500,
  maxEndpoints: 200,
};

export const DISCOVERY_ERROR_CODES = {
  EMPTY_URL: "EMPTY_URL",
  INVALID_URL: "INVALID_URL",
  UNSUPPORTED_PROTOCOL: "UNSUPPORTED_PROTOCOL",
  ABORTED: "ABORTED",
} as const;

const STATIC_EXTENSIONS = new Set([
  "css",
  "js",
  "mjs",
  "cjs",
  "map",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "avif",
  "ico",
  "bmp",
  "tiff",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp4",
  "webm",
  "ogg",
  "mp3",
  "wav",
  "zip",
  "gz",
  "tar",
  "rar",
  "7z",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "rss",
  "atom",
]);

const API_PATH_HINTS = [
  "/api",
  "/v1",
  "/v2",
  "/v3",
  "/rest",
  "/graphql",
  "/gql",
  "/grpc",
  "/rpc",
  "/json",
  "/health",
  "/healthz",
  "/livez",
  "/readyz",
  "/status",
  "/ping",
  "/search",
  "/login",
  "/auth",
  "/oauth",
  "/token",
  "/session",
  "/user",
  "/users",
  "/account",
  "/product",
  "/products",
  "/order",
  "/orders",
  "/cart",
  "/item",
  "/items",
  "/payment",
  "/invoice",
  "/feed",
  "/query",
  "/data",
  "/proxy",
  "/webhook",
  "/hooks",
  "/events",
  "/stream",
  "/service",
];

const POST_PATH_PATTERN = /\/(graphql|gql|rpc)(\/|$|\?)/i;

const UNSAFE_PATH_PATTERN =
  /\/(logout|signout|delete|destroy|remove|purge|unsubscribe|checkout|purchase|pay|charge|refund|transfer|withdraw|revoke|reset-password|deactivate)([/?.]|$)/i;

export class DiscoveryError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "DiscoveryError";
    this.code = code;
  }
}

export function normalizeTargetUrl(input: string): string {
  const trimmed = (input ?? "").trim();
  if (trimmed.length === 0) {
    throw new DiscoveryError(
      "url is required",
      DISCOVERY_ERROR_CODES.EMPTY_URL,
    );
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new DiscoveryError(
      `Invalid URL: ${trimmed}`,
      DISCOVERY_ERROR_CODES.INVALID_URL,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new DiscoveryError(
      `Unsupported protocol "${parsed.protocol}". Only http and https are supported.`,
      DISCOVERY_ERROR_CODES.UNSUPPORTED_PROTOCOL,
    );
  }

  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

export function toRelativePath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://placeholder.invalid");
  } catch {
    return null;
  }

  const path =
    parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
  return `${path}${parsed.search}`;
}

export function isApiLikeUrl(url: string): boolean {
  const pathOnly = (() => {
    try {
      return new URL(url, "https://placeholder.invalid").pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();

  const extension = pathOnly.split(".").pop() ?? "";
  if (pathOnly.includes(".") && STATIC_EXTENSIONS.has(extension)) {
    return false;
  }

  return API_PATH_HINTS.some(
    (hint) =>
      pathOnly === hint ||
      pathOnly.startsWith(`${hint}/`) ||
      pathOnly.startsWith(`${hint}?`),
  );
}

export function isSafeToLoadTest(path: string): boolean {
  return !UNSAFE_PATH_PATTERN.test(path);
}

export function inferHttpMethod(path: string): HttpMethod {
  return POST_PATH_PATTERN.test(path) ? "POST" : "GET";
}

export function parseRobotsTxt(text: string): Omit<RobotsInfo, "found"> {
  const sitemaps: string[] = [];
  const disallowedPaths: string[] = [];
  const allowedPaths: string[] = [];
  const userAgents: string[] = [];
  let crawlDelaySeconds: number | null = null;

  const pushUnique = (target: string[], value: string): void => {
    if (value.length > 0 && !target.includes(value)) target.push(value);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line.length === 0) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const field = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    switch (field) {
      case "user-agent":
        pushUnique(userAgents, value);
        break;
      case "disallow":
        pushUnique(disallowedPaths, value);
        break;
      case "allow":
        pushUnique(allowedPaths, value);
        break;
      case "crawl-delay": {
        if (crawlDelaySeconds === null) {
          const parsed = Number.parseFloat(value);
          if (Number.isFinite(parsed) && parsed >= 0) {
            crawlDelaySeconds = parsed;
          }
        }
        break;
      }
      case "sitemap":
        pushUnique(sitemaps, value);
        break;
      default:
        break;
    }
  }

  return {
    crawlDelaySeconds,
    sitemaps,
    disallowedPaths,
    allowedPaths,
    userAgents,
  };
}

export function parseSitemapXml(xml: string): {
  locations: string[];
  isIndex: boolean;
} {
  const locations: string[] = [];
  const pattern = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    const raw = match[1]
      .trim()
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "")
      .trim();

    if (raw.length > 0 && !locations.includes(raw)) {
      locations.push(raw);
    }
  }

  return { locations, isIndex: /<sitemapindex\b/i.test(xml) };
}

export function isDisallowedByRobots(
  path: string,
  disallowedPaths: string[],
): boolean {
  const target = path.split("?")[0];

  return disallowedPaths.some((rule) => {
    if (rule.length === 0 || rule === "/") return false;

    const anchored = rule.endsWith("$");
    const pattern = anchored ? rule.slice(0, -1) : rule;
    const segments = pattern
      .split("*")
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    return new RegExp(`^${segments.join(".*")}${anchored ? "$" : ""}`).test(
      target,
    );
  });
}

export async function fetchText(
  url: string,
  options: DiscoveryOptions = {},
): Promise<FetchTextResult> {
  const timeoutMs = options.timeoutMs ?? DISCOVERY_DEFAULTS.timeoutMs;
  const userAgent = options.userAgent ?? DISCOVERY_DEFAULTS.userAgent;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = (): void => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        accept: "text/plain,application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return { ok: false, status: response.status, body: null, contentType };
    }

    return {
      ok: true,
      status: response.status,
      body: await response.text(),
      contentType,
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

async function loadRobots(
  baseUrl: string,
  options: DiscoveryOptions,
): Promise<{ info: RobotsInfo; errors: string[] }> {
  const errors: string[] = [];
  const missing: RobotsInfo = {
    found: false,
    crawlDelaySeconds: null,
    sitemaps: [],
    disallowedPaths: [],
    allowedPaths: [],
    userAgents: [],
  };

  try {
    const response = await fetchText(`${baseUrl}/robots.txt`, options);

    if (!response.ok || response.body === null) {
      errors.push(`robots.txt responded with status ${response.status}`);
      return { info: missing, errors };
    }

    return { info: { ...parseRobotsTxt(response.body), found: true }, errors };
  } catch (error) {
    errors.push(`robots.txt fetch failed: ${describeError(error)}`);
    return { info: missing, errors };
  }
}

async function loadSitemapUrls(
  sitemapUrls: string[],
  options: DiscoveryOptions,
): Promise<{ urls: string[]; visited: string[]; errors: string[] }> {
  const maxSitemaps = options.maxSitemaps ?? DISCOVERY_DEFAULTS.maxSitemaps;
  const maxUrlsPerSitemap =
    options.maxUrlsPerSitemap ?? DISCOVERY_DEFAULTS.maxUrlsPerSitemap;

  const urls: string[] = [];
  const visited: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const queue = sitemapUrls.slice(0, maxSitemaps);

  while (queue.length > 0 && visited.length < maxSitemaps) {
    if (options.signal?.aborted) break;

    const sitemapUrl = queue.shift() as string;
    if (seen.has(sitemapUrl)) continue;

    seen.add(sitemapUrl);
    visited.push(sitemapUrl);

    try {
      const response = await fetchText(sitemapUrl, options);

      if (!response.ok || response.body === null) {
        errors.push(
          `sitemap ${sitemapUrl} responded with status ${response.status}`,
        );
        continue;
      }

      const parsed = parseSitemapXml(response.body);

      if (parsed.isIndex) {
        for (const nested of parsed.locations) {
          if (seen.has(nested) || queue.length >= maxSitemaps) continue;
          queue.push(nested);
        }
        continue;
      }

      for (const location of parsed.locations.slice(0, maxUrlsPerSitemap)) {
        if (!urls.includes(location)) {
          urls.push(location);
        }
      }
    } catch (error) {
      errors.push(
        `sitemap ${sitemapUrl} fetch failed: ${describeError(error)}`,
      );
    }
  }

  if (queue.length > 0) {
    errors.push(
      `sitemap limit of ${maxSitemaps} reached, ${queue.length} sitemap(s) skipped`,
    );
  }

  return { urls, visited, errors };
}

export async function discoverEndpoints(
  input: string,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const baseUrl = normalizeTargetUrl(input);
  const maxEndpoints = options.maxEndpoints ?? DISCOVERY_DEFAULTS.maxEndpoints;
  const discoveredAt = new Date().toISOString();

  const { info: robots, errors: robotsErrors } = await loadRobots(
    baseUrl,
    options,
  );
  const errors = [...robotsErrors];

  if (options.signal?.aborted) {
    throw new DiscoveryError(
      "Discovery aborted before it completed",
      DISCOVERY_ERROR_CODES.ABORTED,
    );
  }

  const sitemapCandidates =
    robots.sitemaps.length > 0 ? robots.sitemaps : [`${baseUrl}/sitemap.xml`];
  const {
    urls: sitemapUrls,
    visited,
    errors: sitemapErrors,
  } = await loadSitemapUrls(sitemapCandidates, options);
  errors.push(...sitemapErrors);

  const origin = new URL(baseUrl).origin;
  const endpoints: EndpointInfo[] = [];
  const blockedEndpoints: EndpointInfo[] = [];
  const seen = new Set<string>();

  const addEndpoint = (source: EndpointSource, path: string): void => {
    const key = `${source} ${path}`;
    if (seen.has(key)) return;

    seen.add(key);
    if (isDisallowedByRobots(path, robots.disallowedPaths)) {
      if (blockedEndpoints.length < maxEndpoints) {
        blockedEndpoints.push({
          method: inferHttpMethod(path),
          path,
          source,
          discoveredAt,
        });
      }
      return;
    }

    if (endpoints.length < maxEndpoints) {
      endpoints.push({
        method: inferHttpMethod(path),
        path,
        source,
        discoveredAt,
      });
    }
  };

  for (const rule of robots.disallowedPaths) {
    const path = toRelativePath(rule);
    if (path === null) continue;
    addEndpoint("robots", path);
  }

  for (const location of sitemapUrls) {
    let sameOrigin: boolean;
    try {
      sameOrigin = new URL(location, baseUrl).origin === origin;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) continue;

    const path = toRelativePath(location);
    if (path === null || !isApiLikeUrl(path) || !isSafeToLoadTest(path))
      continue;

    addEndpoint("sitemap", path);
  }

  const fallbackToRoot = endpoints.length === 0;
  if (fallbackToRoot) {
    errors.push(
      "No API-like endpoints found in robots.txt or sitemap.xml, load testing the target root instead",
    );
  }

  return {
    input,
    baseUrl,
    origin,
    discoveredAt,
    robots,
    sitemapsFetched: visited,
    endpoints,
    blockedEndpoints,
    fallbackToRoot,
    errors,
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "request timed out" : error.message;
  }
  return String(error);
}
