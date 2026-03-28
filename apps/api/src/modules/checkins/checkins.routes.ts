import { query } from "../../db/query";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { badRequest } from "../../common/http/errors";
import { VOTE_INTENT_OPTIONS } from "../../common/constants/campaign";
import { requireRole } from "../../common/middleware/role";
import { checkinCreate, lastCheckinsForPerson } from "./checkins.repo";
import { logEvent } from "../events/events.repo";
import { campaignTreeScope } from "../../common/campaign/scope";

export async function checkinsRoutes(app: FastifyInstance) {
  app.get(
    "/person/:personId",
    { preHandler: [app.requireAuth] },
    async (req: any) => {
      const p = z.object({ personId: z.string().uuid() }).parse(req.params);
      return lastCheckinsForPerson(req.user.campaignId, p.personId);
    },
  );

  app.post(
    "/",
    { preHandler: [app.requireAuth, requireRole(["ADMIN", "COORDINATOR", "STATION_MANAGER", "OPERATOR", "VOLUNTEER"])] },
    async (req: any) => {
      const body = z.object({
        stationId: z.string().uuid(),
        personId: z.string().uuid(),
        voteIntentSnapshot: z.enum(VOTE_INTENT_OPTIONS).optional(),
        notes: z.string().optional(),
      }).parse(req.body);

      let warning: string | undefined;

      const existingCheck = await query(
        `SELECT s.name as station_name, sc.checkin_at
         FROM station_checkins sc
         JOIN persons checked_person ON checked_person.id = sc.person_id
         JOIN persons target_person ON target_person.id = $2
         JOIN stations s ON sc.station_id = s.id
         WHERE ${campaignTreeScope("sc", 1)}
           AND ${campaignTreeScope("checked_person", 1)}
           AND ${campaignTreeScope("target_person", 1)}
           AND checked_person.deleted_at IS NULL
           AND target_person.deleted_at IS NULL
           AND checked_person.citizen_id = target_person.citizen_id
           AND sc.checkin_at >= CURRENT_DATE
           AND sc.checkin_at < CURRENT_DATE + INTERVAL '1 day'`,
        [req.user.campaignId, body.personId]
      );

      if (existingCheck.rows.length > 0) {
        const station = existingCheck.rows[0].station_name;
        const time = new Date(existingCheck.rows[0].checkin_at).toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
        });
        warning = `AtenciÃ³n: Esta persona ya pasÃ³ hoy a las ${time} por: "${station}".`;
      }

      try {
        const prevStatusRes = await query(
          `SELECT status_day_d
           FROM persons p
           WHERE p.id=$1
             AND ${campaignTreeScope("p", 2)}
             AND p.deleted_at IS NULL`,
          [body.personId, req.user.campaignId]
        );
        const prevStatusDayD = prevStatusRes.rows[0]?.status_day_d ?? null;

        const row = await checkinCreate({
          campaignId: req.user.campaignId,
          stationId: body.stationId,
          personId: body.personId,
          recordedByUserId: req.user.userId,
          voteIntentSnapshot: body.voteIntentSnapshot ?? null,
          notes: body.notes ?? null,
        });

        await logEvent({
          campaignId: req.user.campaignId,
          eventType: "STATION_CHECKIN_CREATED",
          actorUserId: req.user.userId,
          personId: body.personId,
          stationId: body.stationId,
          payload: {
            voteIntentSnapshot: body.voteIntentSnapshot ?? null,
            checkinId: row?.id ?? null,
            previousStatusDayD: prevStatusDayD
          },
        });

        return { ...row, warning };
      } catch (e: any) {
        if (e?.code === "23505") throw badRequest("Esta persona ya estÃ¡ registrada en ESTE puesto.");
        throw e;
      }
    }
  );
}
