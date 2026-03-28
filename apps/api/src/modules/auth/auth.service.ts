import { query } from "../../db/query";
import { comparePassword, hashPassword } from "../../common/security/password";
import { unauthorized, badRequest, notFound } from "../../common/http/errors";
import { campaignTreeScope, resolveRootCampaignId } from "../../common/campaign/scope";

export async function login(email: string, passwordPlain: string) {
  const res = await query(
    `SELECT id, campaign_id, email, password_hash, full_name, role, is_active
     FROM users
     WHERE LOWER(email) = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 2`,
    [email.toLowerCase()]
  );

  if (res.rows.length === 0) throw unauthorized("Credenciales invÃ¡lidas");
  if (res.rows.length > 1) {
    throw badRequest("Este email estÃ¡ asociado a mÃºltiples campaÃ±as. Contacta al administrador.");
  }

  const user = res.rows[0];
  if (!user) throw unauthorized("Credenciales invÃ¡lidas");
  if (!user.is_active) throw unauthorized("Usuario desactivado");

  const match = await comparePassword(passwordPlain, user.password_hash);
  if (!match) throw unauthorized("Credenciales invÃ¡lidas");

  const rootCampaignId = await resolveRootCampaignId(user.campaign_id);

  delete user.password_hash;
  return {
    userId: user.id,
    campaignId: rootCampaignId,
    role: user.role,
    email: user.email,
    fullName: user.full_name,
  };
}

export async function changePassword(userId: string, current: string, newPass: string) {
  const res = await query(`SELECT password_hash FROM users WHERE id=$1 AND deleted_at IS NULL`, [userId]);
  const user = res.rows[0];
  if (!user) throw unauthorized();

  const match = await comparePassword(current, user.password_hash);
  if (!match) throw badRequest("La contraseÃ±a actual es incorrecta");

  const newHash = await hashPassword(newPass);
  await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, userId]);
}

export async function adminResetPassword(campaignId: string, targetUserId: string, newPass: string) {
  const check = await query(
    `SELECT id
     FROM users u
     WHERE u.id = $1
       AND ${campaignTreeScope("u", 2)}
       AND u.deleted_at IS NULL`,
    [targetUserId, campaignId]
  );

  if (!check.rows[0]) throw notFound("Usuario no encontrado en esta campaÃ±a");

  const newHash = await hashPassword(newPass);
  await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, targetUserId]);
}
