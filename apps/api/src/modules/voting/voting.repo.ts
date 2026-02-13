import { query, pool } from "../../db/query";
import { taskCreate } from "../tasks/tasks.repo"; 

export async function markVoted(input: {
  campaignId: string;
  personId: string;
  markedByUserId?: string | null;
  stationId?: string | null;
  method?: string | null;
  notes?: string | null;
}) {
  // 1) guardamos marca (idempotente por UNIQUE(campaign_id, person_id))
  await query(
    `INSERT INTO person_voted_marks (campaign_id, person_id, marked_by_user_id, station_id, method, notes)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (campaign_id, person_id)
     DO UPDATE SET marked_by_user_id=EXCLUDED.marked_by_user_id,
                   station_id=EXCLUDED.station_id,
                   method=EXCLUDED.method,
                   notes=EXCLUDED.notes,
                   marked_at=now()`,
    [
      input.campaignId,
      input.personId,
      input.markedByUserId ?? null,
      input.stationId ?? null,
      input.method ?? null,
      input.notes ?? null,
    ]
  );

  // 2) reflejamos estado actual en persons (Allows Parent to mark Child's person)
  const res = await query(
    `UPDATE persons
     SET has_voted=true, status_day_d='VOTED', updated_at=now()
     WHERE (campaign_id=$1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) 
       AND id=$2
     RETURNING *`,
    [input.campaignId, input.personId]
  );
  
  return res.rows[0];
}

export async function listMissingByTerritory(input: {
  campaignId: string;
  cityId?: string;
  zoneId?: string;
  neighborhoodId?: string;
  limit?: number;
}) {
  const params: any[] = [input.campaignId];
  // Hierarchy Support
  let where = `WHERE (p.campaign_id=$1 OR p.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) AND p.has_voted=false`;

  if (input.cityId) { params.push(input.cityId); where += ` AND p.city_id=$${params.length}`; }
  if (input.zoneId) { params.push(input.zoneId); where += ` AND p.zone_id=$${params.length}`; }
  if (input.neighborhoodId) { params.push(input.neighborhoodId); where += ` AND p.neighborhood_id=$${params.length}`; }

  const limit = input.limit ?? 200;
  params.push(limit);

  const res = await query(
    `SELECT 
        p.id, 
        g.document_id, 
        g.first_name, 
        g.last_name, 
        p.current_vote_intent, 
        p.city_id, 
        p.zone_id, 
        p.neighborhood_id
     FROM persons p
     JOIN global_citizens g ON p.citizen_id = g.id
     ${where}
     ORDER BY g.last_name, g.first_name
     LIMIT $${params.length}`,
    params
  );

  return res.rows;
}

// --- NEW DAY D LOGIC USING TASKS ---

// 1. Trigger Transporte: Crea Tarea URGENT de tipo LOGISTICS
export async function createTransportTask(
    campaignId: string, 
    userId: string, 
    data: { personId: string; pickupAddress: string; destinationAddress?: string; notes?: string; assignedUserId?: string }
) {
    // Primero obtenemos el nombre de la persona para el título
    const pRes = await query(`
        SELECT g.first_name, g.last_name 
        FROM persons p 
        JOIN global_citizens g ON p.citizen_id = g.id 
        WHERE p.id = $2
          AND (p.campaign_id = $1 OR p.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
    `, [campaignId, data.personId]);
    
    if (pRes.rows.length === 0) throw new Error("Person not found");
    const p = pRes.rows[0];

    const title = `Buscar a ${p.first_name} ${p.last_name} en ${data.pickupAddress}`;

    // Update person status (Hierarchy Support)
    await query(
        `UPDATE persons SET needs_transport = true, transport_status = 'PENDING' 
         WHERE (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) 
         AND id = $2`,
        [campaignId, data.personId]
    );

    return taskCreate(campaignId, userId, {
        title: title,
        description: data.notes ?? `Destino: ${data.destinationAddress || 'PC Central'}`,
        priority: 'URGENT',
        taskType: 'LOGISTICS',
        relatedPersonId: data.personId,
        locationText: data.pickupAddress,
        assignedUserId: data.assignedUserId // <--- Pass to task
    });
}

// 2. Trigger Logística/Viático: Crea Tarea URGENT de tipo FINANCIAL
export async function createFinancialTask(
    campaignId: string,
    userId: string,
    data: { personId: string; notes?: string; assignedUserId?: string }
) {
     const pRes = await query(`
        SELECT g.first_name, g.last_name 
        FROM persons p 
        JOIN global_citizens g ON p.citizen_id = g.id 
        WHERE p.id = $2
          AND (p.campaign_id = $1 OR p.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
    `, [campaignId, data.personId]);
    
    if (pRes.rows.length === 0) throw new Error("Person not found");
    const p = pRes.rows[0];

    const title = `Entrega de Viático/Logística a ${p.first_name} ${p.last_name}`;

    // Update person status if needed (Hierarchy Support)
    await query(
        `UPDATE persons SET has_financial_needs = true 
         WHERE (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) 
         AND id = $2`,
        [campaignId, data.personId]
    );

    return taskCreate(campaignId, userId, {
        title: title,
        description: data.notes,
        priority: 'URGENT',
        taskType: 'FINANCIAL',
        relatedPersonId: data.personId,
        assignedUserId: data.assignedUserId // <--- Pass to task
    });
}

// 3. The Grid (Simplified)
export async function getDayDGrid(campaignId: string, params: {
    q?: string,
    limit?: number,
    offset?: number
}) {
    const { q = "", limit = 50, offset = 0 } = params;
    const queryParams: any[] = [campaignId];
    let paramIndex = 2;
    
    // Hierarchy Support
    let where = `(p.campaign_id = $1 OR p.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))`;
    let exactDocParamIndex: number | null = null;
    
    if (q) {
        exactDocParamIndex = paramIndex;
        const likeParamIndex = paramIndex + 1;
        where += ` AND (g.document_id = $${exactDocParamIndex} OR g.document_id ILIKE $${likeParamIndex} OR g.first_name ILIKE $${likeParamIndex} OR g.last_name ILIKE $${likeParamIndex})`;
        queryParams.push(q, `%${q}%`);
        paramIndex += 2;
    }

    const sql = `
      SELECT
        p.id,
        p.citizen_id,
        p.has_voted,
        p.status_day_d,
        p.needs_transport,
        p.transport_status,
        p.has_financial_needs,
        p.financial_needs_fulfilled,
        p.financial_amount,
        p.requests,
        p.notes,
        p.current_vote_intent,
        p.campaign_status,
        p.assigned_station_id,
        p.station_checkin_at,
        g.document_id,
        g.first_name,
        g.last_name,
        g.voting_table_number
      FROM persons p
      JOIN global_citizens g ON p.citizen_id = g.id
      WHERE ${where}
      ORDER BY 
        ${exactDocParamIndex ? `CASE WHEN g.document_id = $${exactDocParamIndex} THEN 1 ELSE 0 END DESC,` : ``}
        p.has_voted ASC, -- Primero los que no votaron
        g.last_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const res = await query(sql, queryParams);
    return res.rows;
}

// 4. Detección de Colisiones GLOBAL (Cross-PC)
export async function checkCollision(campaignId: string, citizenId: string): Promise<{ active: boolean; details?: any }> {
  // Buscamos si la persona tiene actividad RECIENTE (últimas 2 horas) 
  // en OTRO puesto de comando diferente al actual se chequeará en el service
  const sql = `
    SELECT 
      lt.campaign_id,
      lt.status,
      lt.recorded_at,
      u.full_name as operator_name
    FROM logistics_tracking lt
    JOIN users u ON lt.operator_id = u.id
    JOIN persons p ON lt.person_id = p.id
    WHERE p.citizen_id = $1 
      AND (lt.campaign_id = $2 OR lt.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $2))
      AND lt.recorded_at > NOW() - INTERVAL '2 hours'
    ORDER BY lt.recorded_at DESC
    LIMIT 1
  `;
  
  const res = await query(sql, [citizenId, campaignId]);
  if (res.rows.length > 0) {
    return { active: true, details: res.rows[0] };
  }
  return { active: false };
}

// 5. Update Status (Optimistic)
export async function updateDayDStatus(
    campaignId: string, 
    userId: string, 
    personId: string, 
    newStatus: string
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Update person (Hierarchy Support)
        const updateSql = `
            UPDATE persons 
            SET status_day_d = $1,
                has_voted = CASE WHEN $1 = 'VOTED' THEN true ELSE has_voted END,
                updated_at = NOW()
            WHERE id = $2 
              AND (campaign_id = $3 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $3))
            RETURNING id, status_day_d
        `;
        const res = await client.query(updateSql, [newStatus, personId, campaignId]);
        
        if (res.rowCount === 0) {
            throw new Error("Person not found");
        }

        // Log traking
        const logSql = `
            INSERT INTO logistics_tracking (campaign_id, person_id, status, operator_id)
            VALUES ($1, $2, $3, $4)
        `;
        await client.query(logSql, [campaignId, personId, newStatus, userId]);

        await client.query("COMMIT");
        return res.rows[0];
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}
