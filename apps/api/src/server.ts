import { buildApp } from "./app.js";

const app = buildApp();

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "0.0.0.0";

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`🚀 PulseTrace API Server listening on ${address}`);
});
