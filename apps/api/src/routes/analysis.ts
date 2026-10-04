import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { analyzeRequestSchema } from "@pulsetrace/validation";
import { discoverEndpoints, DiscoveryError } from "../services/discovery.js";
import { runLoadTestWithSummary } from "../services/loadtester.js";
import {
  buildAnalysisReport,
  getLatestReport,
  setLatestReport,
} from "../services/report.js";

let analysisInProgress = false;

function requestId(request: FastifyRequest): string {
  return (request as { requestId?: string }).requestId ?? "unknown";
}

function withScheme(body: Record<string, unknown>): Record<string, unknown> {
  const url = body.url;

  if (typeof url !== "string") return body;

  const trimmed = url.trim();
  if (trimmed.length === 0 || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed))
    return body;

  return { ...body, url: `https://${trimmed}` };
}

export default async function analysisRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/analyze",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawBody = (request.body ?? {}) as Record<string, unknown>;
      const parsed = analyzeRequestSchema.safeParse(withScheme(rawBody));

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid analyze payload",
            details: parsed.error.flatten(),
            requestId: requestId(request),
          },
        });
      }

      if (analysisInProgress) {
        return reply.status(409).send({
          error: {
            code: "ANALYSIS_IN_PROGRESS",
            message:
              "An analysis is already running. Wait for it to finish before starting another.",
            requestId: requestId(request),
          },
        });
      }

      const { url, durationSeconds, virtualUsers, concurrencyPerUser } =
        parsed.data;
      const abortController = new AbortController();

      reply.raw.on("close", () => {
        if (reply.raw.writableEnded) return;
        abortController.abort();
        fastify.log.warn(
          { requestId: requestId(request) },
          "client disconnected, aborting analysis",
        );
      });

      analysisInProgress = true;
      const startedAt = new Date().toISOString();

      try {
        const discovery = await discoverEndpoints(url, {
          signal: abortController.signal,
        });

        const { results, summary } = await runLoadTestWithSummary(
          discovery.baseUrl,
          discovery.endpoints,
          {
            durationSeconds,
            virtualUsers,
            concurrencyPerUser,
            signal: abortController.signal,
          },
        );

        const report = buildAnalysisReport({
          results,
          discovery,
          summary,
          durationSeconds,
          virtualUsers,
          concurrencyPerUser,
        });

        setLatestReport(report);

        fastify.log.info(
          {
            requestId: requestId(request),
            targetUrl: discovery.baseUrl,
            endpoints: discovery.endpoints.length,
            requests: results.length,
            durationMs: summary.elapsedMs,
          },
          `analysis finished for ${discovery.baseUrl}`,
        );

        return reply.send({ data: report });
      } catch (error) {
        const code =
          error instanceof DiscoveryError ? error.code : "ANALYSIS_FAILED";
        const message =
          error instanceof DiscoveryError
            ? error.message
            : "Failed to analyze the target URL";

        fastify.log.error(
          { requestId: requestId(request), err: error, startedAt },
          "analysis failed",
        );

        if (error instanceof DiscoveryError) {
          return reply.status(400).send({
            error: { code, message, requestId: requestId(request) },
          });
        }

        return reply.status(502).send({
          error: { code, message, requestId: requestId(request) },
        });
      } finally {
        analysisInProgress = false;
      }
    },
  );

  fastify.get(
    "/report",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const report = getLatestReport();

      if (report === null) {
        return reply.status(404).send({
          error: {
            code: "NO_REPORT_AVAILABLE",
            message:
              "No analysis report available yet. Run POST /analyze first.",
            requestId: requestId(request),
          },
        });
      }

      return reply.send({ data: report });
    },
  );
}
