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
    `INSERT INTO station_checkins (campaign_id, station_id, person_id, recorded_by_user_id, vote_intent_snapshot, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
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
  return res.rows[0];
}

export async function lastCheckinsForPerson(campaignId: string, personId: string) {
  const res = await query(
    `SELECT sc.*, s.name AS station_name
     FROM station_checkins sc
     JOIN stations s ON s.id = sc.station_id
     WHERE sc.campaign_id=$1 AND sc.person_id=$2
     ORDER BY sc.checkin_at DESC
     LIMIT 10`,
    [campaignId, personId]
  );
  return res.rows;
}
