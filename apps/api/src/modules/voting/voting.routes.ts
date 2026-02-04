import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { markVoted, listMissingByTerritory, transportRequestCreate, transportRequestsList, transportRequestUpdate, getDayDGrid, checkCollision, updateDayDStatus, registerIncentive } from "./voting.repo";
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

   // --- DAY D CONTROL (MERGED) ---
   
   // 1. THE GRID
   app.get("/grid", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
        query: z.string().optional(),
        limit: z.coerce.number().min(1).max(200).optional().default(50),
        offset: z.coerce.number().min(0).optional().default(0)
    }).parse(req.query);

    return getDayDGrid(req.user.campaignId, { 
        q: q.query, 
        limit: q.limit, 
        offset: q.offset 
    });
   });

   // 2. CHECK COLLISION
   app.get("/check-collision/:citizenId", { preHandler: [app.requireAuth] }, async (req: any) => {
      const { citizenId } = z.object({ citizenId: z.string().uuid() }).parse(req.params);
      return checkCollision(citizenId);
   });

   // 3. UPDATE STATUS
   app.post("/status", { preHandler: [app.requireAuth] }, async (req: any) => {
      const body = z.object({
          personId: z.string().uuid(),
          status: z.enum(['PENDING', 'SEARCHING', 'ON_TRANSIT', 'ARRIVED', 'CHECKED_IN', 'VOTED']),
      }).parse(req.body);

      // Simple collision check before transit logic could go here similar to previous implementation
      // Keeping it lean for consolidation

      return updateDayDStatus(req.user.campaignId, req.user.userId, body.personId, body.status);
   });

   // 4. INCENTIVE
   app.post("/incentive", { 
       preHandler: [
           app.requireAuth, 
           requireRole(["ADMIN", "COORDINATOR"]) 
       ] 
   }, async (req: any) => {
       const body = z.object({
           personId: z.string().uuid(),
           type: z.enum(['viatico', 'combustible', 'logistica', 'snack']),
           amount: z.number().min(0),
           notes: z.string().optional()
       }).parse(req.body);

       return registerIncentive(req.user.campaignId, req.user.userId, body);
   });
}
