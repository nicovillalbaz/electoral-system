import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { notFound } from "../../common/http/errors";
import { stationCreate, stationList, getStationStats, getStationsStatsBatch, getStationCheckins, checkInToStation, stationUpdate, getStationDashboard, addCollaborator, removeCollaborator } from "./stations.repo";
import { logEvent } from "../events/events.repo";

export async function stationsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    return stationList(req.user.campaignId);
  });

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({
      name: z.string().min(2),
      address: z.string().optional(),
      managerUserId: z.string().uuid().optional(),
    }).parse(req.body);

    const station = await stationCreate(req.user.campaignId, body);

    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "STATION_CREATED",
      actorUserId: req.user.userId,
      stationId: station?.id,
      payload: { name: body.name, address: body.address },
    });

    return station;
  });

  app.get("/stats/batch", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({ ids: z.string().optional() }).parse(req.query);
    const ids = (q.ids ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    return getStationsStatsBatch(req.user.campaignId, ids);
  });

  app.get("/:id/stats", { preHandler: [app.requireAuth] }, async (req: any) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return getStationStats(req.user.campaignId, id);
  });

  app.get("/:id/checkins", { preHandler: [app.requireAuth] }, async (req: any) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return getStationCheckins(req.user.campaignId, id);
  });

  app.patch("/:id", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","STATION_MANAGER"])] }, async (req: any) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
        name: z.string().min(2).optional(),
        address: z.string().optional(),
        managerUserId: z.string().uuid().optional(),
        notes: z.string().optional(),
        metadata: z.any().optional(),
    }).parse(req.body);

    const updated = await stationUpdate(req.user.campaignId, id, body);
    if (!updated) throw notFound("Station not found");

    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "STATION_UPDATED",
      actorUserId: req.user.userId,
      stationId: id,
      payload: { changes: body },
    });

    return updated;
  });

  app.post("/checkin", { preHandler: [app.requireAuth] }, async (req: any) => {
       const body = z.object({
           personId: z.string().uuid(),
           stationId: z.string().uuid()
       }).parse(req.body);

       // We need to import checkInToStation from repo.
       return checkInToStation(req.user.campaignId, body.stationId, body.personId, req.user.userId);
  });

  // --- DASHBOARD ENDPOINTS ---

  app.get("/:id/dashboard", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const query = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(50),
        search: z.string().optional().default('')
    }).parse(req.query);
    
    return getStationDashboard(req.user.campaignId, params.id, query.page, query.limit, query.search);
  });

  app.post("/:id/collaborators", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
        personId: z.string().uuid().optional().nullable(),
        role: z.string(),
        // Document ID is now strictly required
        documentId: z.string().min(3),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
    }).parse(req.body);

    return addCollaborator(
        req.user.campaignId, 
        params.id, 
        body.personId ?? null, 
        body.role,
        {
            documentId: body.documentId,
            firstName: body.firstName,
            lastName: body.lastName
        }
    );
  });

  app.delete("/:id/collaborators/:personId", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid(), personId: z.string().uuid() }).parse(req.params);
    return removeCollaborator(req.user.campaignId, params.id, params.personId);
  });
}
