import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { stationCreate, stationList } from "./stations.repo";

export async function stationsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    return stationList(req.user.campaignId);
  });

  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR","STATION_MANAGER"])] }, async (req: any) => {
    const body = z.object({
      name: z.string().min(2),
      address: z.string().optional(),
      cityId: z.string().uuid().optional(),
      zoneId: z.string().uuid().optional(),
      neighborhoodId: z.string().uuid().optional(),
    }).parse(req.body);

    return stationCreate(req.user.campaignId, body);
  });
}
