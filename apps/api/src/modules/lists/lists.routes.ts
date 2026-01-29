import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { listCreate, listAll, listAddMember, listRemoveMember, listMembers } from "./lists.repo";
import { logEvent } from "../events/events.repo";

export async function listsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => listAll(req.user.campaignId));

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const body = z.object({ name: z.string().min(2), description: z.string().optional() }).parse(req.body);
    const row = await listCreate(req.user.campaignId, body.name, body.description ?? null, req.user.userId);
    await logEvent({ campaignId: req.user.campaignId, eventType: "LIST_CREATED", actorUserId: req.user.userId, payload: { listId: row.id } });
    return row;
  });

  app.get("/:listId/members", { preHandler: [app.requireAuth] }, async (req: any) => {
    const p = z.object({ listId: z.string().uuid() }).parse(req.params);
    const q = z.object({ limit: z.coerce.number().min(1).max(1000).optional() }).parse(req.query);
    return listMembers(req.user.campaignId, p.listId, q.limit ?? 200);
  });

  app.post("/add-member", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","OPERATOR","VOLUNTEER","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({ listId: z.string().uuid(), personId: z.string().uuid() }).parse(req.body);
    const row = await listAddMember(req.user.campaignId, body.listId, body.personId, req.user.userId);
    await logEvent({ campaignId: req.user.campaignId, eventType: "LIST_UPDATED", actorUserId: req.user.userId, personId: body.personId, payload: { listId: body.listId, op: "add" } });
    return row ?? { ok: true };
  });

  app.post("/remove-member", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","OPERATOR","VOLUNTEER","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({ listId: z.string().uuid(), personId: z.string().uuid() }).parse(req.body);
    await listRemoveMember(req.user.campaignId, body.listId, body.personId);
    await logEvent({ campaignId: req.user.campaignId, eventType: "LIST_UPDATED", actorUserId: req.user.userId, personId: body.personId, payload: { listId: body.listId, op: "remove" } });
    return { ok: true };
  });
}
