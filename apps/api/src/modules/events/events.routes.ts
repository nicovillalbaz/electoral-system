import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listEvents, logEvent, getEventById } from "./events.repo";
import { requireRole } from "../../common/middleware/role";
import { badRequest } from "../../common/http/errors";
import { assignTag, removeTag } from "../tags/tags.repo";
import { query } from "../../db/query";

export async function eventsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
      personId: z.string().uuid().optional(),
      actorUserId: z.string().uuid().optional(), // Filtro nuevo
      stationId: z.string().uuid().optional(),   // Filtro nuevo
      limit: z.coerce.number().min(1).max(500).optional(),
    }).parse(req.query);

    return listEvents({
      campaignId: req.user.campaignId, 
      personId: q.personId, 
      actorUserId: q.actorUserId,
      stationId: q.stationId,
      limit: q.limit ?? 200
    });
  });

  app.post("/report", { preHandler: [app.requireAuth] }, async (req: any) => {
      const body = z.object({
          type: z.string(),
          description: z.string().optional(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM')
      }).parse(req.body);
  
      await logEvent({
          campaignId: req.user.campaignId,
          eventType: 'INCIDENT_REPORT',
          actorUserId: req.user.userId,
          stationId: undefined, 
          payload: {
              subType: body.type,
              description: body.description,
              severity: body.severity
          }
      });
  
      return { success: true };
    });

  app.post("/:id/revert", { preHandler: [app.requireAuth, requireRole(["ADMIN","COORDINATOR"])] }, async (req: any) => {
    const p = z.object({ id: z.string().uuid() }).parse(req.params);
    const ev = await getEventById(req.user.campaignId, p.id);
    if (!ev) throw badRequest("Evento no encontrado");

    const payload = ev.payload || {};

    if (ev.event_type === "STATION_CHECKIN_CREATED") {
      if (!payload.checkinId) throw badRequest("Este evento no es reversible (falta checkinId).");

      await query(
        `DELETE FROM station_checkins WHERE id=$1 AND campaign_id=$2`,
        [payload.checkinId, req.user.campaignId]
      );

      if (ev.person_id) {
        const stillChecked = await query(
          `SELECT 1 FROM station_checkins 
           WHERE campaign_id=$1 AND person_id=$2 
             AND checkin_at >= CURRENT_DATE 
             AND checkin_at < CURRENT_DATE + INTERVAL '1 day'
           LIMIT 1`,
          [req.user.campaignId, ev.person_id]
        );
        if ((stillChecked.rowCount ?? 0) === 0) {
          await query(
            `UPDATE persons 
             SET status_day_d = $3, updated_at = NOW()
             WHERE id=$1 AND campaign_id=$2`,
            [ev.person_id, req.user.campaignId, payload.previousStatusDayD || 'PENDING']
          );
        }
      }
      return { success: true };
    }

    if (ev.event_type === "TAG_ASSIGNED") {
      if (!ev.person_id || !payload.tagId) throw badRequest("Este evento no es reversible (faltan datos).");
      await removeTag(req.user.campaignId, ev.person_id, payload.tagId);
      return { success: true };
    }

    if (ev.event_type === "TAG_REMOVED") {
      if (!ev.person_id || !payload.tagId) throw badRequest("Este evento no es reversible (faltan datos).");
      await assignTag(req.user.campaignId, ev.person_id, payload.tagId, req.user.userId);
      return { success: true };
    }

    throw badRequest("Este evento no es reversible de forma segura.");
  });
}
