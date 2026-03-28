import { query } from "../../db/query";
import { conflict } from "../../common/http/errors";
import { campaignTreeScope } from "../../common/campaign/scope";

const handleUserWriteError = (error: any): never => {
  if (error?.code === "23505" && error?.constraint === "users_campaign_id_email_key") {
    throw conflict("Ya existe un usuario con ese email en esta campana.");
  }
  throw error;
};

async function ensureUserEmailAvailable(campaignId: string, email: string) {
  const res = await query(
    `SELECT id
     FROM users u
     WHERE ${campaignTreeScope("u", 1)}
       AND LOWER(u.email) = $2
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [campaignId, email.toLowerCase()]
  );

  if (res.rows[0]) {
    throw conflict("Ya existe un usuario con ese email en esta campana.");
  }
}

export async function userCreate(input: {
  campaignId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  operationalRole?: string;
}) {
  try {
    await ensureUserEmailAvailable(input.campaignId, input.email);

    const res = await query(
      `INSERT INTO users (campaign_id, email, password_hash, full_name, role, operational_role, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING id, campaign_id, email, full_name, role, operational_role, is_active, created_at`,
      [input.campaignId, input.email, input.passwordHash, input.fullName, input.role, input.operationalRole]
    );
    return res.rows[0];
  } catch (error) {
    handleUserWriteError(error);
  }
}

export async function userList(campaignId: string) {
  const res = await query(
    `SELECT id, campaign_id, email, full_name, role, operational_role, is_active, assigned_station_id, created_at
     FROM users u
     WHERE ${campaignTreeScope("u", 1)} AND u.deleted_at IS NULL
     ORDER BY created_at DESC`,
    [campaignId]
  );
  return res.rows;
}

export async function userGetById(campaignId: string, id: string) {
  const res = await query(
    `SELECT id, campaign_id, email, full_name, role, operational_role, is_active, assigned_station_id, created_at
     FROM users u
     WHERE ${campaignTreeScope("u", 1)} AND u.id=$2 AND u.deleted_at IS NULL`,
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
    assignedStationId?: string | null;
  }
) {
  const updates: string[] = [];
  const params: any[] = [campaignId, userId];
  let paramIndex = 3;

  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(data.isActive);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    params.push(data.role);
  }
  if (data.fullName !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    params.push(data.fullName);
  }
  if (data.operationalRole !== undefined) {
    updates.push(`operational_role = $${paramIndex++}`);
    params.push(data.operationalRole);
  }
  if (data.passwordHash !== undefined) {
    updates.push(`password_hash = $${paramIndex++}`);
    params.push(data.passwordHash);
  }
  if (Object.prototype.hasOwnProperty.call(data, "assignedStationId")) {
    updates.push(`assigned_station_id = $${paramIndex++}`);
    params.push(data.assignedStationId);
  }

  if (updates.length === 0) return userGetById(campaignId, userId);

  updates.push(`updated_at = NOW()`);

  try {
    const res = await query(
      `UPDATE users u
       SET ${updates.join(", ")}
       WHERE ${campaignTreeScope("u", 1)} AND u.id=$2 AND u.deleted_at IS NULL
       RETURNING id, campaign_id, email, full_name, role, operational_role, is_active, assigned_station_id`,
      params
    );
    return res.rows[0];
  } catch (error) {
    handleUserWriteError(error);
  }
}
