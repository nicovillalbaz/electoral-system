import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { contactCreate, contactsListForPerson } from "./contacts.repo";
import { logEvent } from "../events/events.repo";

export async function contactsRoutes(app: FastifyInstance) {
  app.get("/person/:personId", { preHandler: [app.requireAuth] }, async (req: any) => {
    const p = z.object({ personId: z.string().uuid() }).parse(req.params);
    const q = z.object({ limit: z.coerce.number().min(1).max(500).optional() }).parse(req.query);
    return contactsListForPerson(req.user.campaignId, p.personId, q.limit ?? 50);
  });

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","OPERATOR","VOLUNTEER","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({
      personId: z.string().uuid(),
      stationId: z.string().uuid().optional(),
      channel: z.string().optional(),
      outcome: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const row = await contactCreate({
      campaignId: req.user.campaignId,
      personId: body.personId,
      contactedByUserId: req.user.userId,
      stationId: body.stationId ?? null,
      channel: body.channel ?? "visit",
      outcome: body.outcome ?? null,
      notes: body.notes ?? null,
    });

    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "PERSON_CONTACTED",
      actorUserId: req.user.userId,
      personId: body.personId,
      stationId: body.stationId ?? null,
      payload: { channel: body.channel ?? "visit", outcome: body.outcome ?? null },
    });

    return row;
  });
}
