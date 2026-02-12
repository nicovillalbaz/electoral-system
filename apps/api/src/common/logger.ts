import Fastify from "fastify";
import type { FastifyLoggerInstance } from "fastify";

let sharedLogger: FastifyLoggerInstance = Fastify({ logger: true }).log;

export function setLogger(logger: FastifyLoggerInstance) {
  sharedLogger = logger;
}

export function getLogger() {
  return sharedLogger;
}
