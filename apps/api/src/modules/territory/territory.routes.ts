import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import {
  createCity, listCities,
  createZone, listZones,
  createNeighborhood, listNeighborhoods,
  createPollingPlace, listPollingPlaces,
  createPollingTable, listPollingTables
} from "./territory.repo";

export async function territoryRoutes(app: FastifyInstance) {
  // Cities
  app.get("/cities", { preHandler: [app.requireAuth] }, async (req: any) =>
    listCities(req.user.campaignId)
  );

  app.post("/cities", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({ name: z.string().min(2) }).parse(req.body);
    return createCity(req.user.campaignId, body.name);
  });

  // Zones
  app.get("/zones", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({ cityId: z.string().uuid().optional() }).parse(req.query);
    return listZones(req.user.campaignId, q.cityId);
  });

  app.post("/zones", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({ cityId: z.string().uuid(), name: z.string().min(2) }).parse(req.body);
    return createZone(req.user.campaignId, body.cityId, body.name);
  });

  // Neighborhoods
  app.get("/neighborhoods", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({ zoneId: z.string().uuid().optional() }).parse(req.query);
    return listNeighborhoods(req.user.campaignId, q.zoneId);
  });

  app.post("/neighborhoods", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({ zoneId: z.string().uuid(), name: z.string().min(2) }).parse(req.body);
    return createNeighborhood(req.user.campaignId, body.zoneId, body.name);
  });

  // Polling places
  app.get("/polling-places", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({ zoneId: z.string().uuid().optional() }).parse(req.query);
    return listPollingPlaces(req.user.campaignId, q.zoneId);
  });

  app.post("/polling-places", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({
      zoneId: z.string().uuid(),
      name: z.string().min(2),
      address: z.string().optional(),
    }).parse(req.body);
    return createPollingPlace(req.user.campaignId, body.zoneId, body.name, body.address ?? null);
  });

  // Polling tables
  app.get("/polling-tables", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({ pollingPlaceId: z.string().uuid().optional() }).parse(req.query);
    return listPollingTables(req.user.campaignId, q.pollingPlaceId);
  });

  app.post("/polling-tables", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({ pollingPlaceId: z.string().uuid(), number: z.number().int().positive() }).parse(req.body);
    return createPollingTable(req.user.campaignId, body.pollingPlaceId, body.number);
  });
}
