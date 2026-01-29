import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { hashPassword } from "../../common/security/password";
import { notFound } from "../../common/http/errors";
import { userCreate, userGetById, userList } from "./users.repo";

export async function usersRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: [app.requireAuth] }, async (req: any) => {
    const u = await userGetById(req.user.campaignId, req.user.userId);
    if (!u) throw notFound("User not found");
    return u;
  });

  app.get("/", { preHandler: [app.requireAuth, requireRole(["ADMIN", "COORDINATOR"])] }, async (req: any) => {
    return userList(req.user.campaignId);
  });

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN"])] }, async (req: any) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      role: z.enum(["ADMIN","COORDINATOR","STATION_MANAGER","OPERATOR","VOLUNTEER","VIEWER"]).default("OPERATOR"),
    }).parse(req.body);

    const passwordHash = await hashPassword(body.password);
    return userCreate({
      campaignId: req.user.campaignId,
      email: body.email.toLowerCase(),
      passwordHash,
      fullName: body.fullName,
      role: body.role,
    });
  });
}
