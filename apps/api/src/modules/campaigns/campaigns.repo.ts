import { query } from "../../db/query";

export async function campaignCreate(name: string, cityId: string) {
  const res = await query(
    `INSERT INTO campaigns (name, city_id, status) VALUES ($1, $2, 'ACTIVE') RETURNING *`,
    [name, cityId]
  );
  return res.rows[0];
}
export async function campaignList() {
  // Opcional: Podrías hacer JOIN con cities para mostrar el nombre de la ciudad
  const res = await query(`SELECT * FROM campaigns ORDER BY created_at DESC`);
  return res.rows;
}

export async function campaignGet(id: string) {
  const res = await query(`SELECT * FROM campaigns WHERE id=$1`, [id]);
  return res.rows[0] ?? null;
}
