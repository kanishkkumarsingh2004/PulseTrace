import Fastify from "fastify";
import fastifyCors from "@fastify/cors";

import requestIdPlugin from "./plugins/requestId.js";

import systemRoutes from "./routes/system.js";
import analysisRoutes from "./routes/analysis.js";

export function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty" } }
        : true,
  });

  app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "OPTIONS"],
  });

  app.register(requestIdPlugin);

  app.register(systemRoutes);
  app.register(analysisRoutes);
  app.register(analysisRoutes, { prefix: "/api/v1" });

  return app;
}
