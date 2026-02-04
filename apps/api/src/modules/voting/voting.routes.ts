import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { markVoted, listMissingByTerritory, transportRequestCreate, transportRequestsList, transportRequestUpdate } from "./voting.repo";
import { logEvent } from "../events/events.repo";

export async function votingRoutes(app: FastifyInstance) {
  app.post("/mark-voted", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","STATION_MANAGER","OPERATOR"])] }, async (req: any) => {
    const body = z.object({
      personId: z.string().uuid(),
      stationId: z.string().uuid().optional(),
      method: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const row = await markVoted({
      campaignId: req.user.campaignId,
      personId: body.personId,
      markedByUserId: req.user.userId,
      stationId: body.stationId ?? null,
      method: body.method ?? "table_operator",
      notes: body.notes ?? null,
    });

    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "PERSON_MARKED_VOTED",
      actorUserId: req.user.userId,
      personId: body.personId,
      stationId: body.stationId ?? null,
      payload: { method: body.method ?? "table_operator" },
    });

    return row;
  });

  app.get("/missing", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
      cityId: z.string().uuid().optional(),
      zoneId: z.string().uuid().optional(),
      neighborhoodId: z.string().uuid().optional(),
      limit: z.coerce.number().min(1).max(1000).optional(),
    }).parse(req.query);

    return listMissingByTerritory({
      campaignId: req.user.campaignId,
      cityId: q.cityId,
      zoneId: q.zoneId,
      neighborhoodId: q.neighborhoodId,
      limit: q.limit ?? 200,
    });
  });

  // --- TRANSPORTE ---
  app.post("/transport/request", { preHandler: [app.requireAuth] }, async (req: any) => {
    const body = z.object({
      personId: z.string().uuid(),
      pickupAddress: z.string().optional(),
      pickupLat: z.number().optional(),
      pickupLng: z.number().optional(),
      destinationAddress: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    return transportRequestCreate(req.user.campaignId, body);
  });

  app.get("/transport/requests", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
      status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ALL']).optional(),
    }).parse(req.query);

    return transportRequestsList(req.user.campaignId, q.status);
  });

  app.patch("/transport/requests/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
     const params = z.object({ id: z.string().uuid() }).parse(req.params);
     const body = z.object({
       status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
       driverUserId: z.string().uuid().optional(),
     }).parse(req.body);

     return transportRequestUpdate(req.user.campaignId, params.id, body);
  });
}
