import { TelemetryPayload, TelemetryBatch } from "@pulsetrace/types";

export interface PulseTraceConfig {
  apiKey: string;
  endpointUrl?: string; // default http://localhost:4000/api/v1/telemetry
  serviceName: string;
  environment?: string;
  maxBatchSize?: number; // default 50
  flushIntervalMs?: number; // default 2000
}

export class PulseTraceSDK {
  private apiKey: string;
  private endpointUrl: string;
  private serviceName: string;
  private environment: string;
  private maxBatchSize: number;
  private flushIntervalMs: number;
  private queue: TelemetryPayload[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: PulseTraceConfig) {
    this.apiKey = config.apiKey;
    this.endpointUrl =
      config.endpointUrl || "http://localhost:4000/api/v1/telemetry";
    this.serviceName = config.serviceName;
    this.environment = config.environment || "production";
    this.maxBatchSize = config.maxBatchSize || 50;
    this.flushIntervalMs = config.flushIntervalMs || 2000;

    this.startPeriodicFlush();
  }

  public track(
    event: Omit<TelemetryPayload, "serviceName" | "environment" | "sdkVersion">,
  ): void {
    const payload: TelemetryPayload = {
      ...event,
      serviceName: this.serviceName,
      environment: this.environment,
      sdkVersion: "node-0.1.0",
    };

    this.queue.push(payload);

    if (this.queue.length >= this.maxBatchSize) {
      setImmediate(() => this.flush());
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {
        // Silently swallow errors to never crash target application
      });
    }, this.flushIntervalMs);

    if (this.flushTimer.unref) {
      this.flushTimer.unref(); // Don't keep Node process alive
    }
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToFlush = [...this.queue];
    this.queue = [];

    const batch: TelemetryBatch = {
      apiKey: this.apiKey,
      sentAt: new Date().toISOString(),
      events: eventsToFlush,
    };

    try {
      await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
    } catch {
      // Fire-and-forget: failure to send telemetry should never impact target service
    }
  }
}
