import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listEvents, logEvent, getEventById } from "./events.repo";
import { requireRole } from "../../common/middleware/role";
import { badRequest } from "../../common/http/errors";
import { assignTag, removeTag } from "../tags/tags.repo";
import { query } from "../../db/query";
import { campaignTreeScope } from "../../common/campaign/scope";

export async function eventsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const q = z.object({
      personId: z.string().uuid().optional(),
      actorUserId: z.string().uuid().optional(),
      stationId: z.string().uuid().optional(),
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

  app.post("/:id/revert", { preHandler: [app.requireAuth, requireRole(["ADMIN", "COORDINATOR"])] }, async (req: any) => {
    const p = z.object({ id: z.string().uuid() }).parse(req.params);
    const ev = await getEventById(req.user.campaignId, p.id);
    if (!ev) throw badRequest("Evento no encontrado");

    const payload = ev.payload || {};

    if (ev.event_type === "STATION_CHECKIN_CREATED") {
      if (!payload.checkinId) throw badRequest("Este evento no es reversible (falta checkinId).");

      await query(
        `DELETE FROM station_checkins sc
         WHERE sc.id = $1
           AND ${campaignTreeScope("sc", 2)}`,
        [payload.checkinId, req.user.campaignId]
      );

      if (ev.person_id) {
        const personRes = await query(
          `SELECT p.citizen_id
           FROM persons p
           WHERE p.id = $1
             AND ${campaignTreeScope("p", 2)}
             AND p.deleted_at IS NULL
           LIMIT 1`,
          [ev.person_id, req.user.campaignId]
        );

        const citizenId = personRes.rows[0]?.citizen_id;

        const stillChecked = citizenId
          ? await query(
              `SELECT 1
               FROM station_checkins sc
               JOIN persons p ON p.id = sc.person_id
               WHERE p.citizen_id = $1
                 AND ${campaignTreeScope("sc", 2)}
                 AND ${campaignTreeScope("p", 2)}
                 AND p.deleted_at IS NULL
                 AND sc.checkin_at >= CURRENT_DATE
                 AND sc.checkin_at < CURRENT_DATE + INTERVAL '1 day'
               LIMIT 1`,
              [citizenId, req.user.campaignId]
            )
          : { rowCount: 0 };

        if (citizenId && (stillChecked.rowCount ?? 0) === 0) {
          await query(
            `UPDATE persons p
             SET status_day_d = $1::day_d_status_enum,
                 station_checkin_at = NULL,
                 updated_at = NOW()
             WHERE p.citizen_id = $2
               AND ${campaignTreeScope("p", 3)}
               AND p.deleted_at IS NULL`,
            [payload.previousStatusDayD || "PENDING", citizenId, req.user.campaignId]
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
