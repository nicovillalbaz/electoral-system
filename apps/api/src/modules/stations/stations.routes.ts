import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { stationCreate, stationList, getStationStats, getStationCheckins, checkInToStation } from "./stations.repo";

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

  app.get("/:id/stats", { preHandler: [app.requireAuth] }, async (req: any) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return getStationStats(req.user.campaignId, id);
  });

  app.get("/:id/checkins", { preHandler: [app.requireAuth] }, async (req: any) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return getStationCheckins(req.user.campaignId, id);
  });

  app.post("/checkin", { preHandler: [app.requireAuth] }, async (req: any) => {
       const body = z.object({
           personId: z.string().uuid(),
           stationId: z.string().uuid()
       }).parse(req.body);

       // We need to import checkInToStation from repo.
       // I'll add the import line in a separate edit or just assume it's exposed.
       // For now let's just add the route and I'll fix the import.
       return checkInToStation(req.user.campaignId, body.stationId, body.personId, req.user.userId);
  });
}
