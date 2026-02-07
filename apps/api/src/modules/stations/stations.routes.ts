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
       return checkInToStation(req.user.campaignId, body.stationId, body.personId, req.user.userId);
  });

  // --- DASHBOARD ENDPOINTS ---

  app.get("/:id/dashboard", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const query = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(50),
        search: z.string().optional().default('')
    }).parse(req.query);
    
    // Need to import getStationDashboard
    const { getStationDashboard } = require("./stations.repo"); 
    return getStationDashboard(req.user.campaignId, params.id, query.page, query.limit, query.search);
  });

  app.post("/:id/collaborators", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
        personId: z.string().uuid(),
        role: z.string()
    }).parse(req.body);

    const { addCollaborator } = require("./stations.repo");
    return addCollaborator(req.user.campaignId, params.id, body.personId, body.role);
  });

  app.delete("/:id/collaborators/:personId", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid(), personId: z.string().uuid() }).parse(req.params);
    const { removeCollaborator } = require("./stations.repo");
    return removeCollaborator(req.user.campaignId, params.id, params.personId);
  });
}
