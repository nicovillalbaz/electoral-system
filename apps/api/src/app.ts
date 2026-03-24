import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { ZodError } from "zod";
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
import { tasksRoutes } from "./modules/tasks/tasks.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";

const uniqueViolationMessages: Record<string, string> = {
  users_campaign_id_email_key: "Ya existe un usuario con ese email en esta campana.",
  global_citizens_document_id_key: "Ya existe un ciudadano con ese documento.",
  persons_campaign_id_citizen_id_key: "Esa persona ya existe en esta campana.",
};

const normalizePath = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.replace(/^\//, "").replace(/\//g, ".");
};

const formatZodFieldErrors = (issues: ZodError["issues"]) =>
  issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

const formatFastifyFieldErrors = (validation: any[]) =>
  validation.map((item) => ({
    field: normalizePath(item?.instancePath) || item?.params?.missingProperty || "request",
    message: item?.message ?? "Invalid value",
    code: item?.keyword ?? "validation_error",
  }));

const mapUniqueViolationMessage = (constraint?: string) => {
  if (constraint && uniqueViolationMessages[constraint]) return uniqueViolationMessages[constraint];
  return "El registro ya existe y no puede duplicarse.";
};


// Hacemos la función ASYNC para garantizar el orden de carga
export async function buildApp() {
  const app = Fastify({ logger: true });

  // --- 1. PLUGINS GLOBALES ---
  await app.register(cors, {
    origin: true, 
    credentials: true,
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

  // --- 2. MIDDLEWARE DE AUTH (CRITICAL: BEFORE ROUTES) ---
  await app.register(authPlugin);

  // --- 3. MANEJADOR DE ERRORES ---
  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof HttpError) {
      return reply
        .status(err.status)
        .send({ error: err.message, details: err.details ?? null });
    }

    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "Bad request",
        details: { fieldErrors: formatZodFieldErrors(err.issues) },
      });
    }

    if (Array.isArray(err?.validation)) {
      return reply.status(400).send({
        error: "Bad request",
        details: {
          fieldErrors: formatFastifyFieldErrors(err.validation),
          context: err.validationContext ?? null,
        },
      });
    }

    if (err?.code === "23505") {
      return reply.status(409).send({
        error: mapUniqueViolationMessage(err.constraint),
        details: {
          code: err.code,
          constraint: err.constraint ?? null,
        },
      });
    }

    app.log.error(err);
    return reply.status(500).send({ error: "Internal server error", details: null });
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
  // Módulo 3: Actividades
  await app.register(tasksRoutes, { prefix: "/tasks" });
  await app.register(notificationsRoutes, { prefix: "/notifications" });


  return app;
}
