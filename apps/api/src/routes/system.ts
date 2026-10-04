import { FastifyInstance } from "fastify";

export default async function systemRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  fastify.get("/ready", async () => ({
    status: "ready",
    timestamp: new Date().toISOString(),
  }));
}
