import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { tagCreate, tagList, assignTag, removeTag, listPersonTags } from "./tags.repo";
import { logEvent } from "../events/events.repo";

export async function tagsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => tagList(req.user.campaignId));

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({ name: z.string().min(1), color: z.string().optional() }).parse(req.body);
    return tagCreate(req.user.campaignId, body.name, body.color ?? null);
  });

  app.get("/person/:personId", { preHandler: [app.requireAuth] }, async (req: any) => {
    const p = z.object({ personId: z.string().uuid() }).parse(req.params);
    return listPersonTags(req.user.campaignId, p.personId);
  });

  app.post("/assign", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","OPERATOR","VOLUNTEER","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({ personId: z.string().uuid(), tagId: z.string().uuid() }).parse(req.body);
    const row = await assignTag(req.user.campaignId, body.personId, body.tagId, req.user.userId);
    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "TAG_ASSIGNED",
      actorUserId: req.user.userId,
      personId: body.personId,
      payload: { tagId: body.tagId },
    });
    return row ?? { ok: true };
  });

  app.post("/remove", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","OPERATOR","VOLUNTEER","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({ personId: z.string().uuid(), tagId: z.string().uuid() }).parse(req.body);
    await removeTag(req.user.campaignId, body.personId, body.tagId);
    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "TAG_REMOVED",
      actorUserId: req.user.userId,
      personId: body.personId,
      payload: { tagId: body.tagId },
    });
    return { ok: true };
  });
}
