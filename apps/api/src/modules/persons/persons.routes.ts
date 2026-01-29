import { FastifyInstance } from "fastify";
import { z } from "zod";
import { notFound } from "../../common/http/errors";
import { requireRole } from "../../common/middleware/role";
import { personsSearch, personGet, personCreate, personUpdate } from "./persons.repo";

export async function personsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const queryZ = z.object({ q: z.string().optional(), limit: z.coerce.number().optional() }).parse(req.query);
    const campaignId = req.user.campaignId;
    const res = await personsSearch(campaignId, queryZ.q ?? "", queryZ.limit ?? 50);
    return res.rows;
  });

  app.get("/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const campaignId = req.user.campaignId;
    const res = await personGet(campaignId, params.id);
    if (!res.rows[0]) throw notFound("Person not found");
    return res.rows[0];
  });

  app.post(
    "/",
    { preHandler: [app.requireAuth, requireRole(["ADMIN", "COORDINATOR", "OPERATOR"])] },
    async (req: any) => {
      const body = z
        .object({
          documentId: z.string().min(3),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          currentVoteIntent: z.enum(["SURE", "PROBABLE", "UNDECIDED", "OPPOSITION", "ABSTAIN"]).optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);

      const campaignId = req.user.campaignId;
      const res = await personCreate(campaignId, body);
      return res.rows[0];
    }
  );

  app.patch(
    "/:id",
    { preHandler: [app.requireAuth, requireRole(["ADMIN", "COORDINATOR", "OPERATOR"])] },
    async (req: any) => {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);
      const body = z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          currentVoteIntent: z.enum(["SURE", "PROBABLE", "UNDECIDED", "OPPOSITION", "ABSTAIN"]).optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);

      const campaignId = req.user.campaignId;
      const res = await personUpdate(campaignId, params.id, body);
      if (!res.rows[0]) throw notFound("Person not found");
      return res.rows[0];
    }
  );
}
