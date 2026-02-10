import { query } from "../../db/query";

export async function userCreate(input: {
  campaignId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  operationalRole?: string;
}) {
  const res = await query(
    `INSERT INTO users (campaign_id, email, password_hash, full_name, role, operational_role, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,true)
     RETURNING id, campaign_id, email, full_name, role, operational_role, is_active, created_at`,
    [input.campaignId, input.email, input.passwordHash, input.fullName, input.role, input.operationalRole]
  );
  return res.rows[0];
}

export async function userList(campaignId: string) {
  const res = await query(
    `SELECT id, campaign_id, email, full_name, role, operational_role, is_active, created_at
     FROM users
     WHERE campaign_id=$1
     ORDER BY created_at DESC`,
    [campaignId]
  );
  return res.rows;
}

export async function userGetById(campaignId: string, id: string) {
  const res = await query(
    `SELECT id, campaign_id, email, full_name, role, operational_role, is_active, created_at
     FROM users
     WHERE campaign_id=$1 AND id=$2`,
    [campaignId, id]
  );
  return res.rows[0] ?? null;
}

export async function userUpdate(
  campaignId: string,
  userId: string,
  data: { 
    isActive?: boolean; 
    role?: string; 
    fullName?: string; 
    operationalRole?: string;
    passwordHash?: string;
    assignedStationId?: string;
  }
) {
  // COALESCE permite que si el valor es undefined, mantenga el valor actual de la base de datos
  const res = await query(
    `UPDATE users
         role = COALESCE($4, role),
         full_name = COALESCE($5, full_name),
         operational_role = COALESCE($6, operational_role),
         password_hash = COALESCE($7, password_hash),
         assigned_station_id = COALESCE($8, assigned_station_id)
     WHERE campaign_id=$1 AND id=$2
     RETURNING id, campaign_id, email, full_name, role, operational_role, is_active, assigned_station_id`,
    [campaignId, userId, data.isActive, data.role, data.fullName, data.operationalRole, data.passwordHash, data.assignedStationId]
  );
  return res.rows[0];
}