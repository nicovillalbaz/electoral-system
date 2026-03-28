import { query } from "../../db/query";
import { campaignTreeScope } from "../../common/campaign/scope";

export async function checkinCreate(input: {
  campaignId: string;
  stationId: string;
  personId: string;
  recordedByUserId?: string | null;
  voteIntentSnapshot?: string | null;
  notes?: string | null;
}) {
  const personRes = await query<{ citizen_id: string }>(
    `SELECT p.citizen_id
     FROM persons p
     WHERE p.id = $1
       AND ${campaignTreeScope("p", 2)}
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [input.personId, input.campaignId]
  );

  if ((personRes.rowCount ?? 0) === 0) {
    throw new Error("Person not found");
  }

  const citizenId = personRes.rows[0].citizen_id;

  const res = await query(
    `INSERT INTO station_checkins (campaign_id, station_id, person_id, recorded_by_user_id, checkin_by_user_id, vote_intent_snapshot, notes, date_bucket)
     VALUES ($1,$2,$3,$4,$4,$5,$6,CURRENT_DATE)
     ON CONFLICT (campaign_id, station_id, person_id, date_bucket)
     DO UPDATE SET
       recorded_by_user_id = COALESCE(EXCLUDED.recorded_by_user_id, station_checkins.recorded_by_user_id),
       checkin_by_user_id = COALESCE(EXCLUDED.checkin_by_user_id, station_checkins.checkin_by_user_id),
       vote_intent_snapshot = COALESCE(EXCLUDED.vote_intent_snapshot, station_checkins.vote_intent_snapshot),
       notes = COALESCE(EXCLUDED.notes, station_checkins.notes)
     RETURNING *`,
    [
      input.campaignId,
      input.stationId,
      input.personId,
      input.recordedByUserId ?? null,
      input.voteIntentSnapshot ?? null,
      input.notes ?? null,
    ]
  );

  await query(
    `UPDATE persons p
     SET status_day_d = CASE
           WHEN p.has_voted THEN 'VOTED'::day_d_status_enum
           ELSE 'CHECKED_IN'::day_d_status_enum
         END,
         station_checkin_at = NOW(),
         updated_at = NOW()
     WHERE p.citizen_id = $1
       AND ${campaignTreeScope("p", 2)}
       AND p.deleted_at IS NULL`,
    [citizenId, input.campaignId]
  );

  return res.rows[0];
}

export async function lastCheckinsForPerson(campaignId: string, personId: string) {
  const personRes = await query<{ citizen_id: string }>(
    `SELECT p.citizen_id
     FROM persons p
     WHERE p.id = $1
       AND ${campaignTreeScope("p", 2)}
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [personId, campaignId]
  );

  const citizenId = personRes.rows[0]?.citizen_id;
  if (!citizenId) return [];

  const res = await query(
    `SELECT sc.*, s.name AS station_name
     FROM station_checkins sc
     JOIN persons p ON p.id = sc.person_id
     JOIN stations s ON s.id = sc.station_id
     WHERE p.citizen_id = $1
       AND ${campaignTreeScope("sc", 2)}
       AND ${campaignTreeScope("p", 2)}
       AND p.deleted_at IS NULL
     ORDER BY sc.checkin_at DESC
     LIMIT 10`,
    [citizenId, campaignId]
  );

  return res.rows;
}
