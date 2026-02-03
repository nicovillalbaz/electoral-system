import { query } from "../../db/query";

export async function listCreate(campaignId: string, data: any) {
  const res = await query(
    `INSERT INTO lists (campaign_id, name, description, icon, filters, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [campaignId, data.name, data.description, data.icon, data.filters, data.isFavorite]
  );
  return res.rows[0];
}

export async function listsGetAll(campaignId: string) {
  const res = await query(
    `SELECT * FROM lists 
     WHERE campaign_id = $1 
     ORDER BY is_favorite DESC, created_at DESC`,
    [campaignId]
  );
  return res.rows;
}

export async function listGet(campaignId: string, id: string) {
  const res = await query(
    `SELECT * FROM lists WHERE id = $1 AND campaign_id = $2`,
    [id, campaignId]
  );
  return res.rows[0];
}

export async function listDelete(campaignId: string, id: string) {
  await query(`DELETE FROM lists WHERE id = $1 AND campaign_id = $2`, [id, campaignId]);
  return { success: true };
}

// Actualizar (para cambiar nombre o filtros)
export async function listUpdate(campaignId: string, id: string, data: any) {
    // Construcción dinámica de update (simplificada)
    await query(
        `UPDATE lists 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             icon = COALESCE($3, icon),
             filters = COALESCE($4, filters),
             is_favorite = COALESCE($5, is_favorite),
             updated_at = NOW()
         WHERE id = $6 AND campaign_id = $7`,
        [data.name, data.description, data.icon, data.filters, data.isFavorite, id, campaignId]
    );
    return { success: true };
}