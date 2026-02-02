import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { env } from "./config/env";
import { authPlugin } from "./common/middleware/auth"; 
import { HttpError } from "./common/http/errors";

// Routes (Tus rutas originales intactas)
import { authRoutes } from "./modules/auth/auth.routes";
import { campaignsRoutes } from "./modules/campaigns/campaigns.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { territoryRoutes } from "./modules/territory/territory.routes";
import { personsRoutes } from "./modules/persons/persons.routes";
import { stationsRoutes } from "./modules/stations/stations.routes";
import { checkinsRoutes } from "./modules/checkins/checkins.routes";
import { votingRoutes } from "./modules/voting/voting.routes";
import { tagsRoutes } from "./modules/tags/tags.routes";
import { listsRoutes } from "./modules/lists/lists.routes";
import { contactsRoutes } from "./modules/contacts/contacts.routes";
import { eventsRoutes } from "./modules/events/events.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";

// Hacemos la función ASYNC para garantizar el orden de carga
export async function buildApp() {
  const app = Fastify({ logger: true });

  // --- 1. PLUGINS GLOBALES (AQUÍ ESTÁ LA CORRECCIÓN) ---
  await app.register(cors, {
    origin: true, // Permite desarrollo local sin problemas
    credentials: true,
    // AGREGAMOS ESTO PARA QUE FUNCIONE EL 'PATCH' (GUARDAR)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { expiresIn: env.jwtExpiresIn },
  });

  await app.register(swagger, {
    swagger: {
      info: { title: "Electoral System API", version: "1.0.0" },
    },
  });

  await app.register(swaggerUI, { routePrefix: "/docs" });

  // --- 2. MIDDLEWARE DE AUTH ---
  await app.register(authPlugin);

  // --- 3. MANEJADOR DE ERRORES ---
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) {
      return reply
        .status(err.status)
        .send({ error: err.message, details: err.details ?? null });
    }
    app.log.error(err);
    return reply.status(500).send({ error: "Internal server error" });
  });

  // Health check simple
  app.get("/health", async () => ({ ok: true }));

  // --- 4. REGISTRO DE RUTAS ---
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(campaignsRoutes, { prefix: "/campaigns" });
  await app.register(usersRoutes, { prefix: "/users" });
  await app.register(territoryRoutes, { prefix: "/territory" });
  await app.register(personsRoutes, { prefix: "/persons" });
  await app.register(stationsRoutes, { prefix: "/stations" });
  await app.register(checkinsRoutes, { prefix: "/checkins" });
  await app.register(votingRoutes, { prefix: "/voting" });
  await app.register(tagsRoutes, { prefix: "/tags" });
  await app.register(listsRoutes, { prefix: "/lists" });
  await app.register(contactsRoutes, { prefix: "/contacts" });
  await app.register(eventsRoutes, { prefix: "/events" });
  await app.register(dashboardRoutes, { prefix: "/dashboard" });

  return app;
}