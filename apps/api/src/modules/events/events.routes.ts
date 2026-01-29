import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listEvents } from "./events.repo";

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
}