import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { hashPassword } from "../../common/security/password";
import { notFound } from "../../common/http/errors";
import { userCreate, userGetById, userList, userUpdate } from "./users.repo";

export async function usersRoutes(app: FastifyInstance) {
  
  // 1. OBTENER MI PERFIL
  app.get("/me", { preHandler: [app.requireAuth] }, async (req: any) => {
    const u = await userGetById(req.user.campaignId, req.user.userId);
    if (!u) throw notFound("User not found");
    return u;
  });

  // 2. LISTAR USUARIOS (Solo Admin y Coordinadores)
  app.get("/", { preHandler: [app.requireAuth, requireRole(["ADMIN", "COORDINATOR"])] }, async (req: any) => {
    return userList(req.user.campaignId);
  });

  // 3. CREAR USUARIO (SOLUCIÓN AL ERROR DE FULLNAME)
  app.post("/", { preHandler: [app.requireAuth, requireRole(["ADMIN"])] }, async (req: any) => {
    
    // Validamos relajadamente para aceptar varios formatos de nombre
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      // Aceptamos fullName (camelCase) O full_name (snake_case) para evitar errores
      fullName: z.string().optional(),
      full_name: z.string().optional(),
      name: z.string().optional(),
      role: z.enum(["ADMIN","COORDINATOR","STATION_MANAGER","OPERATOR","VOLUNTEER","VIEWER"]).default("OPERATOR"),
    }).parse(req.body);

    // Lógica de "Rescate": Usamos el que haya venido, o un valor por defecto
    const finalName = body.fullName || body.full_name || body.name || "Sin Nombre";

    const passwordHash = await hashPassword(body.password);
    
    return userCreate({
      campaignId: req.user.campaignId,
      email: body.email.toLowerCase(),
      passwordHash,
      fullName: finalName, // Usamos el nombre ya procesado
      role: body.role,
    });
  });

  // 4. ACTUALIZAR USUARIO
  app.patch(
    "/:id",
    { preHandler: [app.requireAuth, requireRole(["ADMIN"])] },
    async (req: any) => {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);
      
      const body = z.object({
        isActive: z.boolean().optional(), // True = Activo, False = Bloqueado
        role: z.enum(["ADMIN","COORDINATOR","STATION_MANAGER","OPERATOR","VOLUNTEER","VIEWER"]).optional(),
        fullName: z.string().min(2).optional(),
      }).parse(req.body);

      const updated = await userUpdate(req.user.campaignId, params.id, {
        isActive: body.isActive,
        role: body.role,
        fullName: body.fullName
      });

      if (!updated) throw notFound("User not found");
      return updated;
    }
  );
}