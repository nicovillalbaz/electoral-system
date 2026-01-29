import { FastifyInstance } from "fastify";
import { z } from "zod";
import { login, changePassword, adminResetPassword } from "./auth.service"; // Asegúrate de importar esto
import { hashPassword } from "../../common/security/password";
import { query } from "../../db/query";
import { logEvent } from "../events/events.repo";
import { requireRole } from "../../common/middleware/role";

export async function authRoutes(app: FastifyInstance) {
  // Login normal
  app.post("/login", async (req, reply) => {
    const body = z.object({
      campaignId: z.string().uuid(),
      email: z.string().email(),
      password: z.string().min(6),
    }).parse(req.body);

    const user = await login(body.email, body.password, body.campaignId);
    const token = app.jwt.sign(user);

    return reply.send({ token, user });
  });

  // Cambio de contraseña propio (Usuario logueado)
  app.post("/change-password", { preHandler: [app.requireAuth] }, async (req: any, reply) => {
    const body = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    }).parse(req.body);

    await changePassword(req.user.userId, body.currentPassword, body.newPassword);
    
    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "USER_PASSWORD_CHANGE",
      actorUserId: req.user.userId,
      payload: { self: true }
    });

    return reply.send({ success: true });
  });

  // Reset por Admin (Tú reseteas la cuenta de un operador)
  app.post("/admin/reset-password", { preHandler: [app.requireAuth, requireRole(["ADMIN"])] }, async (req: any, reply) => {
    const body = z.object({
      targetUserId: z.string().uuid(),
      newPassword: z.string().min(6),
    }).parse(req.body);

    await adminResetPassword(req.user.campaignId, body.targetUserId, body.newPassword);

    await logEvent({
      campaignId: req.user.campaignId,
      eventType: "ADMIN_RESET_PASSWORD",
      actorUserId: req.user.userId,
      payload: { targetUserId: body.targetUserId }
    });

    return reply.send({ success: true });
  });

  // Endpoint Bootstrap (Solo para crear la primera cuenta)
  app.post("/bootstrap", async (req, reply) => {
    const body = z.object({
      campaignName: z.string().min(2),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(6),
      adminFullName: z.string().min(2),
    }).parse(req.body);

    const existing = await query(`SELECT id FROM campaigns LIMIT 1`);
    if (existing.rows[0]) {
      return reply.status(400).send({ error: "Bootstrap already done" });
    }

    const c = (await query(`INSERT INTO campaigns (name) VALUES ($1) RETURNING *`, [body.campaignName])).rows[0];
    const passwordHash = await hashPassword(body.adminPassword);
    
    const u = (await query(
      `INSERT INTO users (campaign_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'ADMIN', true)
       RETURNING id, campaign_id, email, full_name, role`,
      [c.id, body.adminEmail.toLowerCase(), passwordHash, body.adminFullName]
    )).rows[0];

    return reply.send({ campaign: c, admin: u });
  });
}