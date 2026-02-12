import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "./notifications.repo";

export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    return getUnreadNotifications(req.user.campaignId, req.user.userId);
  });

  app.patch("/:id/read", { preHandler: [app.requireAuth] }, async (req: any) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return markNotificationAsRead(req.user.campaignId, req.user.userId, id);
  });

  app.patch("/read-all", { preHandler: [app.requireAuth] }, async (req: any) => {
      return markAllNotificationsAsRead(req.user.campaignId, req.user.userId);
  });
}
