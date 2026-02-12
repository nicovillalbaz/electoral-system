import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { 
    markVoted, 
    listMissingByTerritory, 
    createTransportTask, 
    createFinancialTask,
    getDayDGrid, 
    checkCollision, 
    updateDayDStatus 
} from "./voting.repo";
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

  // --- DAY D ACTIONS (Task Triggers) ---

  // 1. Trigger Transporte
  app.post("/transport", { preHandler: [app.requireAuth] }, async (req: any) => {
    const body = z.object({
      personId: z.string().uuid(),
      pickupAddress: z.string(),
      destinationAddress: z.string().optional(),
      notes: z.string().optional(),
      assignedUserId: z.string().uuid().optional(), // <--- Added
    }).parse(req.body);

    return createTransportTask(req.user.campaignId, req.user.userId, body);
  });

  // 2. Trigger Logística/Viático
  app.post("/financial", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({
        personId: z.string().uuid(),
        notes: z.string().optional(),
        assignedUserId: z.string().uuid().optional(), // <--- Added
    }).parse(req.body);

    return createFinancialTask(req.user.campaignId, req.user.userId, body);
  });

   // 3. The Grid
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

   // 4. Update Status (Manual/Pass PC)
   app.post("/status", { preHandler: [app.requireAuth] }, async (req: any) => {
      const body = z.object({
          personId: z.string().uuid(),
          status: z.enum(['PENDING', 'SEARCHING', 'ON_TRANSIT', 'ARRIVED', 'CHECKED_IN', 'VOTED']),
      }).parse(req.body);

      return updateDayDStatus(req.user.campaignId, req.user.userId, body.personId, body.status);
   });

   // 5. Check Collision
  app.get("/check-collision/:citizenId", { preHandler: [app.requireAuth] }, async (req: any) => {
      const { citizenId } = z.object({ citizenId: z.string().uuid() }).parse(req.params);
      return checkCollision(req.user.campaignId, citizenId);
   });
}
