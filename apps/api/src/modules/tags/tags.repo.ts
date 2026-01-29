import { query } from "../../db/query";

export async function tagCreate(campaignId: string, name: string, color?: string | null) {
  const res = await query(
    `INSERT INTO tags (campaign_id, name, color) VALUES ($1,$2,$3) RETURNING *`,
    [campaignId, name, color ?? null]
  );
  return res.rows[0];
}

export async function tagList(campaignId: string) {
  const res = await query(`SELECT * FROM tags WHERE campaign_id=$1 ORDER BY name`, [campaignId]);
  return res.rows;
}

export async function assignTag(campaignId: string, personId: string, tagId: string, userId?: string | null) {
  const res = await query(
    `INSERT INTO person_tags (campaign_id, person_id, tag_id, assigned_by_user_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (campaign_id, person_id, tag_id) DO NOTHING
     RETURNING *`,
    [campaignId, personId, tagId, userId ?? null]
  );
  return res.rows[0] ?? null;
}

export async function removeTag(campaignId: string, personId: string, tagId: string) {
  await query(
    `DELETE FROM person_tags WHERE campaign_id=$1 AND person_id=$2 AND tag_id=$3`,
    [campaignId, personId, tagId]
  );
}

export async function listPersonTags(campaignId: string, personId: string) {
  const res = await query(
    `SELECT t.*
     FROM person_tags pt
     JOIN tags t ON t.id = pt.tag_id
     WHERE pt.campaign_id=$1 AND pt.person_id=$2
     ORDER BY t.name`,
    [campaignId, personId]
  );
  return res.rows;
}
