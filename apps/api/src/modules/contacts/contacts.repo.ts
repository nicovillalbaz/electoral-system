import { query } from "../../db/query";
import { campaignTreeScope } from "../../common/campaign/scope";

export async function contactCreate(input: {
  campaignId: string;
  personId: string;
  contactedByUserId?: string | null;
  stationId?: string | null;
  channel?: string | null;
  outcome?: string | null;
  notes?: string | null;
}) {
  const res = await query(
    `INSERT INTO contacts (campaign_id, person_id, contacted_by_user_id, station_id, channel, outcome, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      input.campaignId,
      input.personId,
      input.contactedByUserId ?? null,
      input.stationId ?? null,
      input.channel ?? null,
      input.outcome ?? null,
      input.notes ?? null,
    ]
  );
  return res.rows[0];
}

export async function contactsListForPerson(campaignId: string, personId: string, limit = 50) {
  const res = await query(
    `SELECT *
     FROM contacts c
     WHERE ${campaignTreeScope("c", 1)} AND c.person_id=$2
     ORDER BY contact_at DESC
     LIMIT $3`,
    [campaignId, personId, limit]
  );
  return res.rows;
}
