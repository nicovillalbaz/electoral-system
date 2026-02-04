import { query, pool } from "../../db/query";

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

  // 2) reflejamos estado actual en persons
  const res = await query(
    `UPDATE persons
     SET has_voted=true, updated_at=now()
     WHERE campaign_id=$1 AND id=$2
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
  let where = `WHERE campaign_id=$1 AND has_voted=false`;

  if (input.cityId) { params.push(input.cityId); where += ` AND city_id=$${params.length}`; }
  if (input.zoneId) { params.push(input.zoneId); where += ` AND zone_id=$${params.length}`; }
  if (input.neighborhoodId) { params.push(input.neighborhoodId); where += ` AND neighborhood_id=$${params.length}`; }

  const limit = input.limit ?? 200;
  params.push(limit);

  const res = await query(
    `SELECT id, document_id, first_name, last_name, current_vote_intent, city_id, zone_id, neighborhood_id
     FROM persons
     ${where}
     ORDER BY last_name, first_name
     LIMIT $${params.length}`,
    params
  );

  return res.rows;
}

// --- TRANSPORTE (UBER ELECTORAL) ---

export async function transportRequestCreate(campaignId: string, data: any) {
  const sql = `
    INSERT INTO transport_requests (
      campaign_id,
      person_id,
      pickup_address,
      pickup_lat,
      pickup_lng,
      destination_address,
      status,
      notes,
      requested_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, NOW())
    RETURNING *
  `;
  const res = await query(sql, [
    campaignId,
    data.personId,
    data.pickupAddress,
    data.pickupLat ?? null,
    data.pickupLng ?? null,
    data.destinationAddress ?? null,
    data.notes ?? null
  ]);
  
  // Also update person's needs_transport status
  await query(
    `UPDATE persons SET needs_transport = true, transport_status = 'PENDING' WHERE campaign_id = $1 AND id = $2`,
    [campaignId, data.personId]
  );
  
  return res.rows[0];
}

export async function transportRequestsList(campaignId: string, status?: string) {
  const params: any[] = [campaignId];
  let where = `WHERE t.campaign_id = $1`;
  
  if (status) {
    if (status !== 'ALL') {
      where += ` AND t.status = $2`;
      params.push(status);
    }
  } else {
    // Default to active requests
    where += ` AND t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')`;
  }

  const sql = `
    SELECT 
      t.*,
      p_global.first_name,
      p_global.last_name,
      p_global.phone_number,
      u.full_name as driver_name
    FROM transport_requests t
    JOIN persons p ON t.person_id = p.id
    JOIN global_citizens p_global ON p.citizen_id = p_global.id
    LEFT JOIN users u ON t.driver_user_id = u.id
    ${where}
    ORDER BY t.requested_at ASC
  `;
  
  const res = await query(sql, params);
  return res.rows;
}

export async function transportRequestUpdate(campaignId: string, requestId: string, data: any) {
  const updates: string[] = [];
  const params: any[] = [campaignId, requestId];
  let paramIndex = 3;

  if (data.status) {
    updates.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  
  if (data.driverUserId !== undefined) {
    updates.push(`driver_user_id = $${paramIndex++}`);
    params.push(data.driverUserId);
  }

  if (data.status === 'COMPLETED') {
    updates.push(`completed_at = NOW()`);
  }

  if (updates.length === 0) return { success: true };

  updates.push(`updated_at = NOW()`); // Assuming table has updated_at or we skip it if not

  const sql = `
    UPDATE transport_requests
    SET ${updates.join(", ")}
    WHERE campaign_id = $1 AND id = $2
    RETURNING *
  `;
  
  const res = await query(sql, params);
  const updatedRequest = res.rows[0];
  
  if (updatedRequest && data.status) {
     // Update person status too
     await query(
       `UPDATE persons SET transport_status = $1 WHERE campaign_id = $2 AND id = $3`,
       [data.status, campaignId, updatedRequest.person_id]
     );
  }
  
  return updatedRequest;
}

// --- DAY D CONTROL (MERGED) ---

// 1. Detección de Colisiones GLOBAL (Cross-PC)
export async function checkCollision(citizenId: string): Promise<{ active: boolean; details?: any }> {
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
      AND lt.recorded_at > NOW() - INTERVAL '2 hours'
    ORDER BY lt.recorded_at DESC
    LIMIT 1
  `;
  
  const res = await query(sql, [citizenId]);
  if (res.rows.length > 0) {
    return { active: true, details: res.rows[0] };
  }
  return { active: false };
}

// 2. The Grid - High Density Query
export async function getDayDGrid(campaignId: string, params: {
    q?: string,
    limit?: number,
    offset?: number
}) {
    const { q = "", limit = 50, offset = 0 } = params;
    const queryParams: any[] = [campaignId];
    let paramIndex = 2;
    
    // Optimizada para velocidad
    let where = `p.campaign_id = $1`;
    
    if (q) {
        where += ` AND (g.document_id ILIKE $${paramIndex} OR g.last_name ILIKE $${paramIndex})`;
        queryParams.push(`%${q}%`);
        paramIndex++;
    }

    const sql = `
      SELECT 
        p.id,
        p.citizen_id,
        g.document_id,
        g.first_name,
        g.last_name,
        g.voting_table_number,
        p.status_day_d,
        p.logistics_flag,
        -- Traemos el último incentivo entregado si existe (solo indicador booleano para la grilla general para velocidad)
        EXISTS(SELECT 1 FROM incentives_log il WHERE il.person_id = p.id) as has_incentive
      FROM persons p
      JOIN global_citizens g ON p.citizen_id = g.id
      WHERE ${where}
      ORDER BY 
        CASE WHEN p.status_day_d = 'PENDING' THEN 0 ELSE 1 END, -- Prioridad a los pendientes
        g.last_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const res = await query(sql, queryParams);
    return res.rows;
}

// 3. Update Status (Optimistic)
export async function updateDayDStatus(
    campaignId: string, 
    userId: string, 
    personId: string, 
    newStatus: string
) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Update person
        const updateSql = `
            UPDATE persons 
            SET status_day_d = $1, updated_at = NOW()
            WHERE id = $2 AND campaign_id = $3
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

// 4. Registrar Incentivo (La Celda Discreta)
export async function registerIncentive(
    campaignId: string,
    userId: string,
    data: { personId: string, type: string, amount: number, notes?: string }
) {
    const sql = `
        INSERT INTO incentives_log (campaign_id, person_id, incentive_type, amount, delivered_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at
    `;
    const res = await query(sql, [
        campaignId, 
        data.personId, 
        data.type, 
        data.amount, 
        userId, 
        data.notes || null
    ]);
    return res.rows[0];
}
