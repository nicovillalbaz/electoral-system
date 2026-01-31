import { query, pool } from "../../db/query";
// LISTAR TODO EL PADRÓN (Paginado + JOIN con Datos Reales)
export async function personsList(campaignId: string, limit = 50, offset = 0) {
  return query(
    `SELECT 
        p.id, 
        p.current_vote_intent, 
        p.has_voted, 
        p.is_visited, 
        p.notes,
        -- Datos de Global Citizens (Super Padrón)
        g.document_id, 
        g.first_name, 
        g.last_name, 
        g.address,              -- <--- La Dirección
        g.party_affiliation,    -- <--- El Partido (ANR/PLRA)
        g.voting_order_number,  -- <--- El Orden
        g.sex,
        g.voting_table_id       -- <--- El ID de mesa (lo usaremos luego)
      FROM persons p
      JOIN global_citizens g ON p.citizen_id = g.id
      WHERE p.campaign_id = $1
      ORDER BY g.last_name ASC, g.first_name ASC
      LIMIT $2 OFFSET $3`,
    [campaignId, limit, offset]
  );
}
// BUSCAR (JOIN Global + Local)
// BUSCAR (Actualizado con columnas del Super Padrón)
export async function personsSearch(campaignId: string, q: string, limit = 50) {
  const like = `%${q}%`;
  return query(
    `SELECT 
        p.id, 
        p.campaign_id, 
        p.current_vote_intent, 
        p.has_voted, 
        p.is_visited, 
        p.notes,
        -- Mismos datos que en el Listar para que no se rompa la tabla
        g.document_id, 
        g.first_name, 
        g.last_name, 
        g.address,
        g.party_affiliation, 
        g.voting_order_number,
        g.sex
      FROM persons p
      JOIN global_citizens g ON p.citizen_id = g.id
      WHERE p.campaign_id = $1
        AND (g.document_id ILIKE $2 OR g.first_name ILIKE $2 OR g.last_name ILIKE $2)
      ORDER BY g.last_name, g.first_name
      LIMIT $3`,
    [campaignId, like, limit]
  );
}

// OBTENER UNA (JOIN Global + Local)
export async function personGet(campaignId: string, id: string) {
  return query(
    `SELECT p.*,
       g.document_id, g.first_name, g.last_name, g.party_affiliation, g.birthdate, g.sex, g.address
     FROM persons p
     JOIN global_citizens g ON p.citizen_id = g.id
     WHERE p.campaign_id = $1 AND p.id = $2`, 
    [campaignId, id]
  );
}

// CREAR (Transacción Maestra)
export async function personCreate(campaignId: string, data: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Upsert en Global Citizens
    const citizenRes = await client.query(
      `INSERT INTO global_citizens (document_id, first_name, last_name, party_affiliation, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (document_id) DO UPDATE SET 
         first_name = COALESCE(EXCLUDED.first_name, global_citizens.first_name),
         last_name = COALESCE(EXCLUDED.last_name, global_citizens.last_name),
         updated_at = NOW()
       RETURNING id`,
      [data.documentId, data.firstName, data.lastName, 'ANR'] 
    );
    const citizenId = citizenRes.rows[0].id;

    // 2. Vincular a Campaña
    const personRes = await client.query(
      `INSERT INTO persons (campaign_id, citizen_id, current_vote_intent, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (campaign_id, citizen_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, campaign_id, current_vote_intent, notes`,
      [campaignId, citizenId, data.currentVoteIntent ?? 'UNDECIDED', data.notes ?? null]
    );

    await client.query('COMMIT');
    
    return {
      ...personRes.rows[0],
      document_id: data.documentId,
      first_name: data.firstName,
      last_name: data.lastName
    };

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ACTUALIZAR
export async function personUpdate(campaignId: string, id: string, patch: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query(`SELECT citizen_id FROM persons WHERE id=$1 AND campaign_id=$2`, [id, campaignId]);
    if (current.rows.length === 0) throw new Error("Person not found");
    const citizenId = current.rows[0].citizen_id;

    if (patch.firstName || patch.lastName) {
      await client.query(
        `UPDATE global_citizens 
         SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name)
         WHERE id = $3`,
        [patch.firstName, patch.lastName, citizenId]
      );
    }

    const res = await client.query(
      `UPDATE persons
       SET current_vote_intent = COALESCE($3, current_vote_intent),
           notes = COALESCE($4, notes)
       WHERE campaign_id=$1 AND id=$2
       RETURNING *`,
      [campaignId, id, patch.currentVoteIntent, patch.notes]
    );

    await client.query('COMMIT');
    return res.rows[0]; 

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}