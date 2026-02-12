import { query } from "../../db/query";

interface LogEventParams {
  campaignId: string;
  eventType: string;
  actorUserId?: string | null;
  personId?: string | null;
  stationId?: string | null;
  payload?: any;
}

export async function logEvent(params: LogEventParams) {
  await query(
    `INSERT INTO events (campaign_id, event_type, actor_user_id, person_id, station_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.campaignId,
      params.eventType,
      params.actorUserId || null,
      params.personId || null,
      params.stationId || null,
      JSON.stringify(params.payload || {}),
    ]
  );
}

interface ListEventsFilters {
  campaignId: string;
  personId?: string;
  actorUserId?: string;
  stationId?: string;
  limit: number;
}

export async function listEvents(filters: ListEventsFilters) {
  // Construcción dinámica de query para soportar múltiples filtros
  let sql = `
    SELECT e.*, u.full_name as actor_name, s.name as station_name
    FROM events e
    LEFT JOIN users u ON e.actor_user_id = u.id
    LEFT JOIN stations s ON e.station_id = s.id
    WHERE e.campaign_id = $1
  `;
  const params: any[] = [filters.campaignId];
  let paramIndex = 2;

  if (filters.personId) {
    sql += ` AND e.person_id = $${paramIndex++}`;
    params.push(filters.personId);
  }
  if (filters.actorUserId) {
    sql += ` AND e.actor_user_id = $${paramIndex++}`;
    params.push(filters.actorUserId);
  }
  if (filters.stationId) {
    sql += ` AND e.station_id = $${paramIndex++}`;
    params.push(filters.stationId);
  }

  sql += ` ORDER BY e.created_at DESC LIMIT $${paramIndex}`;
  params.push(filters.limit);

  const res = await query(sql, params);
  return res.rows;
}

export async function getEventById(campaignId: string, eventId: string) {
  const res = await query(
    `SELECT e.*, u.full_name as actor_name, s.name as station_name
     FROM events e
     LEFT JOIN users u ON e.actor_user_id = u.id
     LEFT JOIN stations s ON e.station_id = s.id
     WHERE e.campaign_id = $1 AND e.id = $2
     LIMIT 1`,
    [campaignId, eventId]
  );
  return res.rows[0] ?? null;
}
