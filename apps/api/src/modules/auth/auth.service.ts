import { query } from "../../db/query";
import { comparePassword, hashPassword } from "../../common/security/password";
import { unauthorized, badRequest, notFound } from "../../common/http/errors";

export async function login(email: string, passwordPlain: string, campaignId: string) {
  const res = await query(
    `SELECT id, campaign_id, email, password_hash, full_name, role, is_active
     FROM users
     WHERE email = $1 AND campaign_id = $2`,
    [email.toLowerCase(), campaignId]
  );

  const user = res.rows[0];
  if (!user) throw unauthorized("Credenciales inválidas");
  if (!user.is_active) throw unauthorized("Usuario desactivado");

  const match = await comparePassword(passwordPlain, user.password_hash);
  if (!match) throw unauthorized("Credenciales inválidas");

  // No devolver hash
  delete user.password_hash;
  return { userId: user.id, campaignId: user.campaign_id, role: user.role, email: user.email, fullName: user.full_name };
}

export async function changePassword(userId: string, current: string, newPass: string) {
  const res = await query(`SELECT password_hash FROM users WHERE id=$1`, [userId]);
  const user = res.rows[0];
  if (!user) throw unauthorized();

  const match = await comparePassword(current, user.password_hash);
  if (!match) throw badRequest("La contraseña actual es incorrecta");

  const newHash = await hashPassword(newPass);
  await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, userId]);
}

export async function adminResetPassword(campaignId: string, targetUserId: string, newPass: string) {
  // Verificar que el target pertenezca a la misma campaña
  const check = await query(`SELECT id FROM users WHERE id=$1 AND campaign_id=$2`, [targetUserId, campaignId]);
  if (!check.rows[0]) throw notFound("Usuario no encontrado en esta campaña");

  const newHash = await hashPassword(newPass);
  await query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [newHash, targetUserId]);
}