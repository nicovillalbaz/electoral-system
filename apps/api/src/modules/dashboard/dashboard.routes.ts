import { FastifyInstance } from "fastify";
import { z } from "zod";
import { 
  totals, 
  voteIntentBreakdown, 
  missingByZone, 
  stationActivity, 
  performanceByZone 
} from "./dashboard.repo";

export async function dashboardRoutes(app: FastifyInstance) {
  // KPI Totales (Cajas de arriba)
  app.get("/totals", { preHandler: [app.requireAuth] }, async (req: any) => {
    return totals(req.user.campaignId);
  });

  // Torta de Intención de voto
  app.get("/vote-intent", { preHandler: [app.requireAuth] }, async (req: any) => {
    return voteIntentBreakdown(req.user.campaignId);
  });

  // Gráfico de barras: Faltantes por Zona/Barrio
  app.get("/missing-by-zone", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({ limit: z.coerce.number().min(1).max(200).optional() }).parse(req.query);
    return missingByZone(req.user.campaignId, q.limit ?? 20);
  });

  // Gráfico: Rendimiento % por Zona (Objetivo vs Real)
  app.get("/performance-by-zone", { preHandler: [app.requireAuth] }, async (req: any) => {
    return performanceByZone(req.user.campaignId);
  });

  // Tabla: Puestos más activos
  app.get("/station-activity", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
      hours: z.coerce.number().min(1).max(168).optional(),
      limit: z.coerce.number().min(1).max(200).optional()
    }).parse(req.query);
    return stationActivity(req.user.campaignId, q.hours ?? 24, q.limit ?? 20);
  });
}