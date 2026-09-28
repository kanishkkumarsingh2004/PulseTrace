export interface TelemetryRequest {
  method: string;
  path: string;
  route: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodySize: number;
  clientIp?: string;
  timestamp: string; // ISO-8601 UTC
}

export interface TelemetryResponse {
  statusCode: number;
  headers?: Record<string, string>;
  bodySize: number;
  durationMs: number;
  timestamp: string; // ISO-8601 UTC
}

export interface TelemetryError {
  isError: boolean;
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
}

export interface TelemetryResourceUsage {
  cpuUsagePercent?: number;
  memoryUsageBytes?: number;
  heapUsedBytes?: number;
  activeHandles?: number;
}

export interface TelemetryPayload {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  environment: string;
  sdkVersion: string;
  request: TelemetryRequest;
  response: TelemetryResponse;
  error?: TelemetryError;
  resources?: TelemetryResourceUsage;
  customMetadata?: Record<string, string | number | boolean>;
}

export interface TelemetryBatch {
  apiKey: string;
  sentAt: string;
  events: TelemetryPayload[];
}
