import { query } from "../../db/query";

export async function userCreate(input: {
  campaignId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
}) {
  const res = await query(
    `INSERT INTO users (campaign_id, email, password_hash, full_name, role, is_active)
     VALUES ($1,$2,$3,$4,$5,true)
     RETURNING id, campaign_id, email, full_name, role, is_active, created_at`,
    [input.campaignId, input.email, input.passwordHash, input.fullName, input.role]
  );
  return res.rows[0];
}

export async function userList(campaignId: string) {
  const res = await query(
    `SELECT id, campaign_id, email, full_name, role, is_active, created_at
     FROM users
     WHERE campaign_id=$1
     ORDER BY created_at DESC`,
    [campaignId]
  );
  return res.rows;
}

export async function userGetById(campaignId: string, id: string) {
  const res = await query(
    `SELECT id, campaign_id, email, full_name, role, is_active, created_at
     FROM users
     WHERE campaign_id=$1 AND id=$2`,
    [campaignId, id]
  );
  return res.rows[0] ?? null;
}
