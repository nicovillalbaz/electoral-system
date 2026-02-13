import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../../common/middleware/role";
import { hashPassword } from "../../common/security/password";
import { notFound } from "../../common/http/errors";
import { userCreate, userGetById, userList, userUpdate } from "./users.repo";
import { logEvent } from "../events/events.repo";

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
      operationalRole: z.enum(["JEFE_CAMPAÑA", "COORDINADOR", "PUNTERO", "CHOFER", "MESA_TESTIGO", "OTRO"]).optional(),
    }).parse(req.body);

    // Lógica de "Rescate": Usamos el que haya venido, o un valor por defecto
    const finalName = body.fullName || body.full_name || body.name || "Sin Nombre";

    const passwordHash = await hashPassword(body.password);
    
    const newUser = await userCreate({
      campaignId: req.user.campaignId,
      email: body.email.toLowerCase(),
      passwordHash,
      fullName: finalName,
      role: body.role,
      operationalRole: body.operationalRole,
    });

    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "USER_CREATED",
      actorUserId: req.user.userId,
      payload: { email: body.email.toLowerCase(), role: body.role, fullName: finalName },
    });

    return newUser;
  });

  // 4. ACTUALIZAR USUARIO
  app.patch(
    "/:id",
    { preHandler: [app.requireAuth, requireRole(["ADMIN"])] },
    async (req: any) => {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);
      
      const body = z.object({
        isActive: z.boolean().optional(),
        role: z.enum(["ADMIN","COORDINATOR","STATION_MANAGER","OPERATOR","VOLUNTEER","VIEWER"]).optional(),
        fullName: z.string().min(2).optional(),
        operationalRole: z.enum(["JEFE_CAMPAÑA", "COORDINADOR", "PUNTERO", "CHOFER", "MESA_TESTIGO", "OTRO"]).optional(),
        password: z.string().min(6).optional(),
        assignedStationId: z.string().uuid().optional().nullable(), // Allow null to unassign
      }).parse(req.body);

      const passwordHash = body.password ? await hashPassword(body.password) : undefined;

      const updated = await userUpdate(req.user.campaignId, params.id, {
        isActive: body.isActive,
        role: body.role,
        fullName: body.fullName,
        operationalRole: body.operationalRole,
        passwordHash,
        assignedStationId: body.assignedStationId
      });

      if (!updated) throw notFound("User not found");

      await logEvent({
        campaignId: req.user.campaignId,
        eventType: "USER_UPDATED",
        actorUserId: req.user.userId,
        payload: {
          targetUserId: params.id,
          changes: {
            ...(body.role && { role: body.role }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
            ...(body.fullName && { fullName: body.fullName }),
            ...(body.password && { passwordChanged: true }),
            ...(body.assignedStationId !== undefined && { assignedStationId: body.assignedStationId }),
          },
        },
      });

      return updated;
    }
  );
}
