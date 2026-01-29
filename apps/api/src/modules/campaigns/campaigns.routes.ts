import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { notFound } from "../../common/http/errors";
import { campaignCreate, campaignGet, campaignList } from "./campaigns.repo";

export async function campaignsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth, requireRole(["ADMIN"])] }, async () => {
    return campaignList();
  });

  app.get("/:id", { preHandler: [app.requireAuth, requireRole(["ADMIN"])] }, async (req: any) => {
    const p = z.object({ id: z.string().uuid() }).parse(req.params);
    const c = await campaignGet(p.id);
    if (!c) throw notFound("Campaign not found");
    return c;
  });

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN"])] }, async (req: any) => {
    const body = z.object({ name: z.string().min(2) }).parse(req.body);
    return campaignCreate(body.name);
  });
}
