import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { unauthorized } from "../http/errors";

// 1. Definimos el plugin usando fp (fastify-plugin) para alcance global
export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      // Usamos tu helper de error personalizado
      throw unauthorized(); 
    }
  });
});

// 2. Extendemos los tipos de Fastify para que TS reconozca "requireAuth"
declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}