import { query } from "../../db/query";

export async function listCreate(campaignId: string, name: string, description?: string | null, createdBy?: string | null) {
  const res = await query(
    `INSERT INTO lists (campaign_id, name, description, created_by_user_id)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [campaignId, name, description ?? null, createdBy ?? null]
  );
  return res.rows[0];
}

export async function listAll(campaignId: string) {
  const res = await query(`SELECT * FROM lists WHERE campaign_id=$1 ORDER BY created_at DESC`, [campaignId]);
  return res.rows;
}

export async function listAddMember(campaignId: string, listId: string, personId: string, addedBy?: string | null) {
  const res = await query(
    `INSERT INTO list_members (campaign_id, list_id, person_id, added_by_user_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (campaign_id, list_id, person_id) DO NOTHING
     RETURNING *`,
    [campaignId, listId, personId, addedBy ?? null]
  );
  return res.rows[0] ?? null;
}

export async function listRemoveMember(campaignId: string, listId: string, personId: string) {
  await query(
    `DELETE FROM list_members WHERE campaign_id=$1 AND list_id=$2 AND person_id=$3`,
    [campaignId, listId, personId]
  );
}

export async function listMembers(campaignId: string, listId: string, limit = 200) {
  const res = await query(
    `SELECT p.*
     FROM list_members lm
     JOIN persons p ON p.id = lm.person_id
     WHERE lm.campaign_id=$1 AND lm.list_id=$2
     ORDER BY p.last_name, p.first_name
     LIMIT $3`,
    [campaignId, listId, limit]
  );
  return res.rows;
}
