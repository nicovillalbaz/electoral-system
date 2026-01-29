import { query } from "../../db/query";

export async function campaignCreate(name: string) {
  const res = await query(
    `INSERT INTO campaigns (name) VALUES ($1) RETURNING *`,
    [name]
  );
  return res.rows[0];
}

export async function campaignList() {
  const res = await query(`SELECT * FROM campaigns ORDER BY created_at DESC`);
  return res.rows;
}

export async function campaignGet(id: string) {
  const res = await query(`SELECT * FROM campaigns WHERE id=$1`, [id]);
  return res.rows[0] ?? null;
}
