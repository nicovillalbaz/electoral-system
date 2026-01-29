import { query } from "../../db/query";

export async function personsSearch(campaignId: string, q: string, limit = 50) {
  const like = `%${q}%`;
  return query(
    `SELECT *
     FROM persons
     WHERE campaign_id = $1
       AND (document_id ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)
     ORDER BY last_name, first_name
     LIMIT $3`,
    [campaignId, like, limit]
  );
}

export async function personGet(campaignId: string, id: string) {
  return query(`SELECT * FROM persons WHERE campaign_id=$1 AND id=$2`, [campaignId, id]);
}

export async function personCreate(campaignId: string, data: any) {
  return query(
    `INSERT INTO persons (campaign_id, document_id, first_name, last_name, current_vote_intent, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [campaignId, data.documentId, data.firstName, data.lastName, data.currentVoteIntent ?? null, data.notes ?? null]
  );
}

export async function personUpdate(campaignId: string, id: string, patch: any) {
  return query(
    `UPDATE persons
     SET first_name = COALESCE($3, first_name),
         last_name = COALESCE($4, last_name),
         current_vote_intent = COALESCE($5, current_vote_intent),
         notes = COALESCE($6, notes)
     WHERE campaign_id=$1 AND id=$2
     RETURNING *`,
    [campaignId, id, patch.firstName ?? null, patch.lastName ?? null, patch.currentVoteIntent ?? null, patch.notes ?? null]
  );
}
