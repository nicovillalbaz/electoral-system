import { query } from "../../db/query";

export async function markVoted(input: {
  campaignId: string;
  personId: string;
  markedByUserId?: string | null;
  stationId?: string | null;
  method?: string | null;
  notes?: string | null;
}) {
  // 1) guardamos marca (idempotente por UNIQUE(campaign_id, person_id))
  await query(
    `INSERT INTO person_voted_marks (campaign_id, person_id, marked_by_user_id, station_id, method, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (campaign_id, person_id)
     DO UPDATE SET marked_by_user_id=EXCLUDED.marked_by_user_id,
                   station_id=EXCLUDED.station_id,
                   method=EXCLUDED.method,
                   notes=EXCLUDED.notes,
                   marked_at=now()`,
    [
      input.campaignId,
      input.personId,
      input.markedByUserId ?? null,
      input.stationId ?? null,
      input.method ?? null,
      input.notes ?? null,
    ]
  );

  // 2) reflejamos estado actual en persons
  const res = await query(
    `UPDATE persons
     SET has_voted=true, updated_at=now()
     WHERE campaign_id=$1 AND id=$2
     RETURNING *`,
    [input.campaignId, input.personId]
  );

  return res.rows[0];
}

export async function listMissingByTerritory(input: {
  campaignId: string;
  cityId?: string;
  zoneId?: string;
  neighborhoodId?: string;
  limit?: number;
}) {
  const params: any[] = [input.campaignId];
  let where = `WHERE campaign_id=$1 AND has_voted=false`;

  if (input.cityId) { params.push(input.cityId); where += ` AND city_id=$${params.length}`; }
  if (input.zoneId) { params.push(input.zoneId); where += ` AND zone_id=$${params.length}`; }
  if (input.neighborhoodId) { params.push(input.neighborhoodId); where += ` AND neighborhood_id=$${params.length}`; }

  const limit = input.limit ?? 200;
  params.push(limit);

  const res = await query(
    `SELECT id, document_id, first_name, last_name, current_vote_intent, city_id, zone_id, neighborhood_id
     FROM persons
     ${where}
     ORDER BY last_name, first_name
     LIMIT $${params.length}`,
    params
  );

  return res.rows;
}
