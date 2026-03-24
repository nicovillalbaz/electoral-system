import { query } from "../../db/query";

export async function checkinCreate(input: {
  campaignId: string;
  stationId: string;
  personId: string;
  recordedByUserId?: string | null;
  voteIntentSnapshot?: string | null;
  notes?: string | null;
}) {
  const res = await query(
    `INSERT INTO station_checkins (campaign_id, station_id, person_id, recorded_by_user_id, vote_intent_snapshot, notes, date_bucket)
     VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE)
     ON CONFLICT (campaign_id, station_id, person_id, date_bucket)
     DO UPDATE SET
       recorded_by_user_id = COALESCE(EXCLUDED.recorded_by_user_id, station_checkins.recorded_by_user_id),
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
    `UPDATE persons 
     SET status_day_d = 'CHECKED_IN',
         station_checkin_at = NOW(),
         updated_at = NOW()
     WHERE id=$1 
       AND (campaign_id=$2 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $2))`,
    [input.personId, input.campaignId]
  );
  return res.rows[0];
}

export async function lastCheckinsForPerson(campaignId: string, personId: string) {
  const res = await query(
    `SELECT sc.*, s.name AS station_name
     FROM station_checkins sc
     JOIN stations s ON s.id = sc.station_id
     WHERE (sc.campaign_id=$1 OR sc.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
       AND sc.person_id=$2
     ORDER BY sc.checkin_at DESC
     LIMIT 10`,
    [campaignId, personId]
  );
  return res.rows;
}
