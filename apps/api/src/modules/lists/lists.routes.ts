import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listCreate, listsGetAll, listDelete, listUpdate, listGet } from "./lists.repo";

export async function listsRoutes(app: FastifyInstance) {
  
  // GET TODAS
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    return listsGetAll(req.user.campaignId);
  });

  // POST CREAR
  app.post("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const body = z.object({
        name: z.string(),
        description: z.string().optional(),
        icon: z.string().default("list"),
        // CORRECCIÓN AQUÍ: Definimos explícitamente clave string y valor any
        filters: z.record(z.string(), z.any()), 
        isFavorite: z.boolean().default(false)
    }).parse(req.body);
    
    return listCreate(req.user.campaignId, body);
  });

  // DELETE
  app.delete("/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      return listDelete(req.user.campaignId, id);
  });

  // PATCH
  app.patch("/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      const body = z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          // CORRECCIÓN AQUÍ TAMBIÉN
          filters: z.record(z.string(), z.any()).optional(),
          isFavorite: z.boolean().optional()
      }).parse(req.body);
      return listUpdate(req.user.campaignId, id, body);
  });
}