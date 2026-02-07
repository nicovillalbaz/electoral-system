import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listEvents, logEvent } from "./events.repo";

export async function eventsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
      personId: z.string().uuid().optional(),
      actorUserId: z.string().uuid().optional(), // Filtro nuevo
      stationId: z.string().uuid().optional(),   // Filtro nuevo
      limit: z.coerce.number().min(1).max(500).optional(),
    }).parse(req.query);

    return listEvents({
      campaignId: req.user.campaignId, 
      personId: q.personId, 
      actorUserId: q.actorUserId,
      stationId: q.stationId,
      limit: q.limit ?? 200
    });
  });

  app.post("/report", { preHandler: [app.requireAuth] }, async (req: any) => {
      const body = z.object({
          type: z.string(),
          description: z.string().optional(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM')
      }).parse(req.body);
  
      await logEvent({
          campaignId: req.user.campaignId,
          eventType: 'INCIDENT_REPORT',
          actorUserId: req.user.userId,
          stationId: undefined, 
          payload: {
              subType: body.type,
              description: body.description,
              severity: body.severity
          }
      });
  
      return { success: true };
    });
}