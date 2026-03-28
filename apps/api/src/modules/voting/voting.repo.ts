import { query, pool } from "../../db/query";
import { taskCreate } from "../tasks/tasks.repo"; 

const campaignHierarchyScope = (alias: string, campaignParamIndex: number) =>
  `(${alias}.campaign_id = $${campaignParamIndex} OR ${alias}.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $${campaignParamIndex}))`;

const normalizedCitizenAddressSql =
  "TRIM(UPPER(REGEXP_REPLACE(g.address, '\\s+', ' ', 'g')))";
const normalizedNeighborhoodNameSql =
  "TRIM(UPPER(REGEXP_REPLACE(n.name, '\\s+', ' ', 'g')))";

export async function markVoted(input: {
  campaignId: string;
  personId: string;
  markedByUserId?: string | null;
  stationId?: string | null;
  method?: string | null;
  notes?: string | null;
}) {
  const personRes = await query<{ id: string; citizen_id: string }>(
    `SELECT p.id, p.citizen_id
     FROM persons p
     WHERE p.id = $2
       AND ${campaignHierarchyScope("p", 1)}
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [input.campaignId, input.personId],
  );
  if ((personRes.rowCount ?? 0) === 0) {
    throw new Error("Person not found");
  }
  const target = personRes.rows[0];

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

  // 2) reflejamos estado votado de forma global para todas las campañas que compartan citizen_id.
  const res = await query(
    `UPDATE persons p
     SET has_voted=true, status_day_d='VOTED', updated_at=now()
     WHERE p.citizen_id = $1
       AND ${campaignHierarchyScope("p", 2)}
       AND p.deleted_at IS NULL
     RETURNING *`,
    [target.citizen_id, input.campaignId]
  );
  
  return res.rows.find((row: any) => row.id === input.personId) ?? res.rows[0];
}

export async function listMissingByTerritory(input: {
  campaignId: string;
  cityId?: string;
  zoneId?: string;
  neighborhoodId?: string;
  limit?: number;
}) {
  const params: any[] = [input.campaignId];
  const conditions = [
    campaignHierarchyScope("p", 1),
    `p.has_voted = false`,
    `p.deleted_at IS NULL`,
  ];

  if (input.cityId) {
    params.push(input.cityId);
    conditions.push(`c.id = $${params.length}`);
  }
  if (input.zoneId) {
    params.push(input.zoneId);
    conditions.push(`z.id = $${params.length}`);
  }
  if (input.neighborhoodId) {
    params.push(input.neighborhoodId);
    conditions.push(`n.id = $${params.length}`);
  }

  const limit = input.limit ?? 200;
  params.push(limit);

  const res = await query(
    `SELECT 
        p.id, 
        g.document_id, 
        g.first_name, 
        g.last_name, 
        p.current_vote_intent, 
        c.id AS city_id,
        c.name AS city_name,
        z.id AS zone_id,
        z.name AS zone_name,
        n.id AS neighborhood_id,
        n.name AS neighborhood_name,
        g.address
     FROM persons p
     JOIN global_citizens g ON p.citizen_id = g.id
     LEFT JOIN polling_tables pt ON g.voting_table_id = pt.id
     LEFT JOIN polling_places pp ON pt.polling_place_id = pp.id
     LEFT JOIN zones z ON pp.zone_id = z.id
     LEFT JOIN cities c ON z.city_id = c.id
     LEFT JOIN neighborhoods n
       ON ${campaignHierarchyScope("n", 1)}
      AND n.zone_id = z.id
      AND ${normalizedNeighborhoodNameSql} = ${normalizedCitizenAddressSql}
     WHERE ${conditions.join(" AND ")}
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
  // Actividad global por citizen_id para evitar colisiones entre PCs hermanas.
  const sql = `
    SELECT *
    FROM (
      SELECT
        p.campaign_id,
        'VOTED'::text as status,
        COALESCE(p.updated_at, p.created_at) as recorded_at,
        NULL::text as operator_name
      FROM persons p
      WHERE p.citizen_id = $1
        AND ${campaignHierarchyScope("p", 2)}
        AND p.deleted_at IS NULL
        AND p.has_voted = true

      UNION ALL

      SELECT
        pvm.campaign_id,
        'VOTED_MARK'::text as status,
        pvm.marked_at as recorded_at,
        u.full_name as operator_name
      FROM person_voted_marks pvm
      JOIN persons p ON pvm.person_id = p.id
      LEFT JOIN users u ON pvm.marked_by_user_id = u.id
      WHERE p.citizen_id = $1
        AND ${campaignHierarchyScope("pvm", 2)}
        AND ${campaignHierarchyScope("p", 2)}
        AND pvm.marked_at > NOW() - INTERVAL '24 hours'

      UNION ALL

      SELECT
        sc.campaign_id,
        'CHECKED_IN'::text as status,
        sc.checkin_at as recorded_at,
        u.full_name as operator_name
      FROM station_checkins sc
      JOIN persons p ON sc.person_id = p.id
      LEFT JOIN users u ON sc.checkin_by_user_id = u.id
      WHERE p.citizen_id = $1
        AND ${campaignHierarchyScope("sc", 2)}
        AND ${campaignHierarchyScope("p", 2)}
        AND sc.checkin_at > NOW() - INTERVAL '24 hours'
    ) x
    ORDER BY x.recorded_at DESC
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

        // 1) Lock target row and read citizen_id in tenant scope.
        const targetRes = await client.query(
            `SELECT p.id, p.citizen_id
             FROM persons p
             WHERE p.id = $1
               AND ${campaignHierarchyScope("p", 2)}
               AND p.deleted_at IS NULL
             FOR UPDATE`,
            [personId, campaignId],
        );

        if (targetRes.rowCount === 0) {
            throw new Error("Person not found");
        }
        const currentPerson = targetRes.rows[0];

        // 2) Deterministic lock order across rows for same citizen in this hierarchy.
        await client.query(
            `SELECT p.id
             FROM persons p
             WHERE p.citizen_id = $1
               AND ${campaignHierarchyScope("p", 2)}
               AND p.deleted_at IS NULL
             ORDER BY p.id
             FOR UPDATE`,
            [currentPerson.citizen_id, campaignId],
        );

        // 3) Update requested row after locks.
        const updateSql = `
            UPDATE persons p
            SET status_day_d = $1::day_d_status_enum,
                has_voted = CASE WHEN $1 = 'VOTED' THEN true ELSE p.has_voted END,
                updated_at = NOW()
            WHERE p.id = $2 
              AND ${campaignHierarchyScope("p", 3)}
            RETURNING p.id, p.status_day_d, p.citizen_id
        `;
        const res = await client.query(updateSql, [newStatus, personId, campaignId]);
        const updatedPerson = res.rows[0];

        // 4) Propagate only inside the current hierarchy tree.
        if (newStatus === "VOTED") {
            await client.query(
                `UPDATE persons p
                 SET has_voted = true,
                     status_day_d = 'VOTED'::day_d_status_enum,
                     updated_at = NOW()
                 WHERE p.citizen_id = $1
                   AND ${campaignHierarchyScope("p", 2)}
                   AND p.deleted_at IS NULL`,
                [currentPerson.citizen_id, campaignId],
            );
        }

        // Log traking
        const logSql = `
            INSERT INTO logistics_tracking (campaign_id, person_id, status, operator_id)
            VALUES ($1, $2, $3, $4)
        `;
        await client.query(logSql, [campaignId, personId, newStatus, userId]);

        await client.query("COMMIT");
        return updatedPerson;
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}


