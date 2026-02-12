import { query } from "../../db/query";
import { forbidden } from "../../common/http/errors";

async function assertStationInCampaign(campaignId: string, stationId: string) {
  const res = await query(
    `SELECT 1 FROM stations WHERE id=$1 AND campaign_id=$2`,
    [stationId, campaignId]
  );
  if ((res.rowCount ?? 0) === 0) {
    throw forbidden("Station not found or access denied");
  }
}



type FinancialTaskSource = {
  table: "station_tasks" | "tasks";
  typeColumn: "type" | "task_type";
  personColumn: "person_id" | "related_person_id";
  hasStationId: boolean;
};

async function resolveFinancialTaskSource(): Promise<FinancialTaskSource | null> {
  const stationTasksRes = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'station_tasks'
       AND column_name IN ('type', 'person_id', 'related_person_id', 'station_id')`
  );

  const stationColumns = new Set(stationTasksRes.rows.map((r: any) => r.column_name));
  const hasStationTasks = stationColumns.has('type') && (stationColumns.has('person_id') || stationColumns.has('related_person_id'));

  if (hasStationTasks) {
    return {
      table: 'station_tasks',
      typeColumn: 'type',
      personColumn: stationColumns.has('person_id') ? 'person_id' : 'related_person_id',
      hasStationId: stationColumns.has('station_id')
    };
  }

  const tasksRes = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'tasks'
       AND column_name IN ('task_type', 'related_person_id')`
  );

  const tasksColumns = new Set(tasksRes.rows.map((r: any) => r.column_name));
  const hasTasks = tasksColumns.has('task_type') && tasksColumns.has('related_person_id');

  if (hasTasks) {
    return {
      table: 'tasks',
      typeColumn: 'task_type',
      personColumn: 'related_person_id',
      hasStationId: false
    };
  }

  return null;
}
export async function stationCreate(campaignId: string, data: any) {
  const res = await query(
    `INSERT INTO stations (campaign_id, name, status, city_id, zone_id, neighborhood_id, address, manager_user_id)
     VALUES ($1,$2,'ACTIVE',$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      campaignId,
      data.name,
      data.cityId ?? null,
      data.zoneId ?? null,
      data.neighborhoodId ?? null,
      data.address ?? null,
      data.managerUserId ?? null,
    ]
  );
  return res.rows[0];
}

export async function stationList(campaignId: string) {
  // Enhanced query with KPIs
  const res = await query(
    `SELECT 
        s.*,
        COUNT(p.id) FILTER (WHERE p.assigned_station_id = s.id) as assigned_count,
        COUNT(p.id) FILTER (WHERE p.assigned_station_id = s.id AND (p.status_day_d = 'VOTED' OR p.has_voted = true)) as voted_count
     FROM stations s
     LEFT JOIN persons p 
       ON p.assigned_station_id = s.id 
      AND p.campaign_id = $1
     WHERE s.campaign_id=$1 AND s.deleted_at IS NULL
     GROUP BY s.id
     ORDER BY s.name`,
    [campaignId]
  );
  
  // Cast counts to number because Postgres count returns string
  return res.rows.map(r => ({
      ...r,
      assigned_count: parseInt(r.assigned_count),
      voted_count: parseInt(r.voted_count)
  }));
}

export async function stationUpdate(campaignId: string, id: string, data: any) {
    const res = await query(
        `UPDATE stations 
         SET name = COALESCE($3, name),
             city_id = COALESCE($4, city_id),
             zone_id = COALESCE($5, zone_id),
             neighborhood_id = COALESCE($6, neighborhood_id),
             address = COALESCE($7, address),
             manager_user_id = COALESCE($8, manager_user_id),
             notes = COALESCE($9, notes),
             metadata = COALESCE($10, metadata)
         WHERE id=$1 AND campaign_id=$2
         RETURNING *`,
        [
            id, 
            campaignId, 
            data.name, 
            data.cityId, 
            data.zoneId, 
            data.neighborhoodId, 
            data.address, 
            data.managerUserId,
            data.notes,
            data.metadata
        ]
    );
    return res.rows[0];
}

export async function stationDelete(campaignId: string, id: string) {
    // Soft Delete
    await query(`UPDATE stations SET deleted_at = NOW(), status='INACTIVE' WHERE id=$1 AND campaign_id=$2`, [id, campaignId]);
    return { success: true };
}

export async function getStationStats(campaignId: string, stationId: string) {
  await assertStationInCampaign(campaignId, stationId);

  const source = await resolveFinancialTaskSource();
  const financialSubquery = source
    ? source.table === 'station_tasks'
      ? `(
          SELECT COALESCE(SUM(p.financial_amount), 0)
          FROM station_tasks st
          JOIN persons p ON p.id = st.${source.personColumn}
          WHERE st.campaign_id = $1
            AND st.${source.typeColumn} = 'FINANCIAL'
            AND st.created_at >= CURRENT_DATE
            AND st.created_at < CURRENT_DATE + INTERVAL '1 day'
            ${source.hasStationId ? 'AND st.station_id = $2' : ''}
            ${source.hasStationId ? '' : 'AND p.assigned_station_id = $2'}
            AND p.campaign_id = $1
        ) as financial_total_today`
      : `(
          SELECT COALESCE(SUM(p.financial_amount), 0)
          FROM tasks t
          JOIN persons p ON p.id = t.${source.personColumn}
          WHERE t.campaign_id = $1
            AND t.${source.typeColumn} = 'FINANCIAL'
            AND t.created_at >= CURRENT_DATE
            AND t.created_at < CURRENT_DATE + INTERVAL '1 day'
            AND p.campaign_id = $1
            AND p.assigned_station_id = $2
        ) as financial_total_today`
    : `0 as financial_total_today`;

  const res = await query(
    `SELECT
        (SELECT COUNT(*)::int
           FROM users
          WHERE campaign_id = $1
            AND assigned_station_id = $2
            AND is_active = true) as staff_count,
        (SELECT COUNT(*)::int
           FROM station_checkins
          WHERE campaign_id = $1
            AND station_id = $2
            AND checkin_at >= CURRENT_DATE
            AND checkin_at < CURRENT_DATE + INTERVAL '1 day') as checkins_today,
        ${financialSubquery}`,
    [campaignId, stationId]
  );

  const row = res.rows[0] || {};

  return {
    staff_count: parseInt(row.staff_count ?? 0),
    checkins_today: parseInt(row.checkins_today ?? 0),
    financial_total_today: Number(row.financial_total_today ?? 0)
  };
}


export async function getStationCheckins(campaignId: string, stationId: string) {
    const res = await query(
        `SELECT 
            sc.id as checkin_id,
            sc.checkin_at,
            p.id as person_id,
            p.has_voted,
            g.first_name,
            g.last_name,
            g.document_id
         FROM station_checkins sc
         JOIN persons p ON sc.person_id = p.id
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE sc.campaign_id=$1 
           AND sc.station_id=$2 
           AND sc.checkin_at >= CURRENT_DATE 
           AND sc.checkin_at < CURRENT_DATE + INTERVAL '1 day'
         ORDER BY sc.checkin_at DESC`,
        [campaignId, stationId]
    );
    return res.rows;
}
export async function checkInToStation(campaignId: string, stationId: string, personId: string, userId: string) {
    await assertStationInCampaign(campaignId, stationId);
    const personRes = await query(
        `SELECT 1 FROM persons WHERE id=$1 AND campaign_id=$2`,
        [personId, campaignId]
    );
    if ((personRes.rowCount ?? 0) === 0) {
        throw forbidden("Person not found or access denied");
    }
    // 1. Check if already checked in today?
    // Database constraint usually handles duplicate checkins (station_checkins_pkey typically includes date or unique index).
    // Let's assume schema allows multiple checkins or we just insert.
    
    // We update person status to CHECKED_IN (or similar if we track that in persons table) but usually status_day_d is separate.
    // However, the prompt implies "Pasó por PC" is a boolean check.
    
    const res = await query(
        `INSERT INTO station_checkins (campaign_id, station_id, person_id, checkin_by_user_id, checkin_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [campaignId, stationId, personId, userId]
    );

    // Also update Person to ensure "campaign_status" or similar reflects this?
    // "Pasó por PC" might be `campaign_status = 'VISITED_PC'` or just reliance on this table.
    // User asked for "Checkin Logic". 
    // Let's also update the person's campaign_status if it's "lower" than checked in?
    // Actually, let's just log event.
    // ... existing code ...
    // Also update Person to ensure "campaign_status" or similar reflects this?
    // "Pasó por PC" might be `campaign_status = 'VISITED_PC'` or just reliance on this table.
    // User asked for "Checkin Logic". 
    // Let's also update the person's campaign_status if it's "lower" than checked in?
    // Actually, let's just log event.
    // Sync Day-D status to keep it consistent with station_checkins
    await query(
        `UPDATE persons 
         SET status_day_d = 'CHECKED_IN', updated_at = NOW()
         WHERE id=$1 AND campaign_id=$2`,
        [personId, campaignId]
    );
    return { success: (res.rowCount ?? 0) > 0 };
}



export async function getStationsStatsBatch(campaignId: string, stationIds: string[]) {
  const ids = Array.from(new Set(stationIds)).filter(Boolean);
  if (ids.length === 0) return {};

  const source = await resolveFinancialTaskSource();

  const financialCte = source
    ? source.table === 'station_tasks'
      ? `financial AS (
          SELECT
            ${source.hasStationId ? 'st.station_id' : 'p.assigned_station_id'} as station_id,
            COALESCE(SUM(p.financial_amount), 0) as financial_total_today
          FROM station_tasks st
          JOIN persons p ON p.id = st.${source.personColumn}
          WHERE st.campaign_id = $1
            AND st.${source.typeColumn} = 'FINANCIAL'
            AND st.created_at >= CURRENT_DATE
            AND st.created_at < CURRENT_DATE + INTERVAL '1 day'
            ${source.hasStationId ? 'AND st.station_id = ANY($2::uuid[])' : ''}
            ${source.hasStationId ? '' : 'AND p.assigned_station_id = ANY($2::uuid[])'}
            AND p.campaign_id = $1
          GROUP BY ${source.hasStationId ? 'st.station_id' : 'p.assigned_station_id'}
        )`
      : `financial AS (
          SELECT
            p.assigned_station_id as station_id,
            COALESCE(SUM(p.financial_amount), 0) as financial_total_today
          FROM tasks t
          JOIN persons p ON p.id = t.${source.personColumn}
          WHERE t.campaign_id = $1
            AND t.${source.typeColumn} = 'FINANCIAL'
            AND t.created_at >= CURRENT_DATE
            AND t.created_at < CURRENT_DATE + INTERVAL '1 day'
            AND p.campaign_id = $1
            AND p.assigned_station_id = ANY($2::uuid[])
          GROUP BY p.assigned_station_id
        )`
    : `financial AS (
          SELECT NULL::uuid as station_id, 0::numeric as financial_total_today
          WHERE false
        )`;

  const sql = `
    WITH staff AS (
      SELECT assigned_station_id as station_id, COUNT(*)::int as staff_count
      FROM users
      WHERE campaign_id = $1
        AND is_active = true
        AND assigned_station_id = ANY($2::uuid[])
      GROUP BY assigned_station_id
    ),
    checkins AS (
      SELECT station_id, COUNT(*)::int as checkins_today
      FROM station_checkins
      WHERE campaign_id = $1
        AND station_id = ANY($2::uuid[])
        AND checkin_at >= CURRENT_DATE
        AND checkin_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY station_id
    ),
    ${financialCte}
    SELECT
      s.id as station_id,
      COALESCE(staff.staff_count, 0) as staff_count,
      COALESCE(checkins.checkins_today, 0) as checkins_today,
      COALESCE(financial.financial_total_today, 0) as financial_total_today
    FROM stations s
    LEFT JOIN staff ON staff.station_id = s.id
    LEFT JOIN checkins ON checkins.station_id = s.id
    LEFT JOIN financial ON financial.station_id = s.id
    WHERE s.campaign_id = $1
      AND s.id = ANY($2::uuid[])
  `;

  const res = await query(sql, [campaignId, ids]);

  const result: Record<string, { staff: number; checkins: number; financial: number }> = {};
  ids.forEach((id) => {
    result[id] = { staff: 0, checkins: 0, financial: 0 };
  });

  res.rows.forEach((row: any) => {
    result[row.station_id] = {
      staff: parseInt(row.staff_count ?? 0),
      checkins: parseInt(row.checkins_today ?? 0),
      financial: Number(row.financial_total_today ?? 0)
    };
  });

  return result;
}
// --- TEAM MANAGEMENT ---

// --- TEAM MANAGEMENT ---

import { personCreate } from "../persons/persons.repo";
import { query as _query } from "../../db/query"; // Alias just in case, but we use 'query' imported above

export async function addCollaborator(campaignId: string, stationId: string, personId: string | null, role: string, citizenData?: any) {
    await assertStationInCampaign(campaignId, stationId);
    let targetPersonId = personId;

    if (targetPersonId) {
        const pRes = await query(
            `SELECT 1 FROM persons WHERE id=$1 AND campaign_id=$2`,
            [targetPersonId, campaignId]
        );
        if ((pRes.rowCount ?? 0) === 0) {
            throw forbidden("Person not found or access denied");
        }
    }

    // 1. Strict CI-based Lookup / Creation
    if (citizenData && citizenData.documentId) {
        // Cleaning documentId just in case
        const docId = citizenData.documentId.trim();

        // Check if person exists by document_id in THIS campaign
        const existingRes = await query(
            `SELECT p.id, g.first_name, g.last_name
             FROM persons p 
             JOIN global_citizens g ON p.citizen_id = g.id
             WHERE p.campaign_id=$1 AND g.document_id=$2`,
            [campaignId, docId]
        );

        if (existingRes.rows.length > 0) {
            const existing = existingRes.rows[0];
            targetPersonId = existing.id;

            // CHECK: Is data incomplete? (Null, empty, or placeholder "NN")
            const currentFirst = existing.first_name || "";
            const currentLast = existing.last_name || "";
            const isIncomplete = !currentFirst.trim() || !currentLast.trim() || currentFirst === 'NN' || currentLast === 'NN';

            if (isIncomplete && citizenData.firstName && citizenData.lastName) {
                // UPDATE names in global_citizens (via subquery or direct update if we had ID, here we need citizen_id from the join)
                // Let's get citizen_id first or do a join update. 
                // Simpler: Update global_citizens linked to this person.
                await query(
                    `UPDATE global_citizens 
                     SET first_name = $1, last_name = $2
                     FROM persons p
                     WHERE global_citizens.id = p.citizen_id 
                       AND p.id = $3`,
                    [citizenData.firstName.toUpperCase(), citizenData.lastName.toUpperCase(), targetPersonId]
                );
            }
        } else {
            // Create Person (Linked to Global Citizen)
            const newPerson = await personCreate(campaignId, {
                documentId: docId,
                firstName: citizenData.firstName?.toUpperCase(),
                lastName: citizenData.lastName?.toUpperCase(),
                // Defaults
                phoneNumber: null, 
                partyAffiliation: 'ANR'
            });
            targetPersonId = newPerson.id;
        }
    }

    if (!targetPersonId) {
        throw new Error("Document ID is required to add a collaborator.");
    }

    const res = await query(
        `INSERT INTO station_collaborators (station_id, person_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (station_id, person_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING *`,
        [stationId, targetPersonId, role]
    );
    return res.rows[0];
}

export async function removeCollaborator(campaignId: string, stationId: string, personId: string) {
    await assertStationInCampaign(campaignId, stationId);
    await query(
        `DELETE FROM station_collaborators WHERE station_id=$1 AND person_id=$2`,
        [stationId, personId]
    );
    return { success: true };
}

// --- DASHBOARD ---

export async function getStationDashboard(campaignId: string, stationId: string, page: number = 1, limit: number = 50, search: string = '') {
    const offset = (page - 1) * limit;
    await assertStationInCampaign(campaignId, stationId);

    // 1. Collaborators
    const collaborators = await query(
        `SELECT sc.*, g.first_name, g.last_name, g.document_id
         FROM station_collaborators sc
         JOIN stations s ON sc.station_id = s.id
         JOIN persons p ON sc.person_id = p.id
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE sc.station_id=$1 AND s.campaign_id=$2 AND p.campaign_id=$2`,
        [stationId, campaignId]
    );

    const assignedUsers = await query(
        `SELECT id, full_name, role, operational_role, assigned_station_id
         FROM users
         WHERE campaign_id=$1 AND assigned_station_id=$2 AND is_active=true
         ORDER BY full_name`,
        [campaignId, stationId]
    );

    // 2. Stats (Fixed: Uses station_checkins for visits)
    const statsQuery = await query(
        `SELECT 
            (SELECT COUNT(*) FROM persons WHERE assigned_station_id=$1 AND campaign_id=$2) as total_assigned,
            (SELECT COUNT(DISTINCT person_id) 
               FROM station_checkins 
              WHERE station_id=$1 
                AND campaign_id=$2 
                AND checkin_at >= CURRENT_DATE 
                AND checkin_at < CURRENT_DATE + INTERVAL '1 day') as total_visited_pc,
            (SELECT COUNT(*) FROM persons WHERE assigned_station_id=$1 AND campaign_id=$2 AND (status_day_d='VOTED' OR has_voted=true)) as total_voted
         FROM persons
         WHERE campaign_id=$2`, 
        [stationId, campaignId]
    );

    // 3. Voters (Paginated & Searched)
    let whereClause = `p.campaign_id=$1 AND p.assigned_station_id=$2`;
    const params: any[] = [campaignId, stationId];

    if (search) {
        whereClause += ` AND (g.first_name ILIKE $3 OR g.last_name ILIKE $3 OR g.document_id ILIKE $3)`;
        params.push(`%${search}%`);
    }

    const baseParams = [...params];
    const limitParam = baseParams.length + 1;
    const offsetParam = baseParams.length + 2;
    const votersParams = [...baseParams, limit, offset];

    const votersQuery = await query(
        `SELECT p.id, g.first_name, g.last_name, g.document_id, g.voting_table_number, 
                p.campaign_status, p.status_day_d, p.has_voted, COALESCE(p.requests, '[]'::jsonb) as requests, p.notes,
                p.has_financial_needs, p.financial_amount, p.financial_needs_fulfilled,
                p.current_vote_intent
         FROM persons p
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE ${whereClause}
         ORDER BY g.last_name, g.first_name
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        votersParams
    );
    
    // Total count for pagination
    const countQuery = await query(
        `SELECT COUNT(*) as val 
         FROM persons p 
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE ${whereClause}`,
        baseParams
    );

    // Process Flags & Details efficiently
    const processedVoters = votersQuery.rows.map(v => {
        const reqs = Array.isArray(v.requests) ? v.requests : [];
        
        // Parse LOGISTICS
        const logReq = reqs.find((r:any) => r.type === 'LOGISTICS');
        const subtypes = logReq?.subtypes || (logReq?.detail ? [logReq.detail] : []);
        const logResponsible = logReq?.responsible || null;
        const logStatus = logReq?.status || 'PENDING';

        // Parse FINANCIAL (Search in requests as requested)
        const finReq = reqs.find((r:any) => r.type === 'FINANCIAL');
        const finAmount = finReq?.amount || v.financial_amount || 0;
        const finFulfilled = finReq?.status === 'COMPLETED' || v.financial_needs_fulfilled;

        return {
            ...v,
            logistics: {
                has_needs: subtypes.length > 0,
                subtypes: subtypes,
                responsible: logResponsible,
                status: logStatus,
                has_fuel: subtypes.includes('FUEL'),
                has_transport: subtypes.includes('TRANSPORT'),
                has_snack: subtypes.includes('SNACK'),
                has_accompaniment: subtypes.includes('ACCOMPANIMENT'),
            },
            financial: {
                has_needs: !!finReq || v.has_financial_needs,
                amount: finAmount,
                fulfilled: finFulfilled,
                details: finReq
            }
        };
    });
    
    // 4. Check-in Status Optimization
    const personIds = processedVoters.map((p: any) => p.id);
    let checkinsMap: Record<string, boolean> = {};
    
    if (personIds.length > 0) {
        const checkinsRes = await query(
            `SELECT person_id FROM station_checkins 
             WHERE station_id=$1 
               AND campaign_id=$3
               AND checkin_at >= CURRENT_DATE 
               AND checkin_at < CURRENT_DATE + INTERVAL '1 day' 
             AND person_id = ANY($2::uuid[])`,
            [stationId, personIds, campaignId]
        );
        checkinsRes.rows.forEach(row => {
            checkinsMap[row.person_id] = true;
        });
    }

    const finalVoters = processedVoters.map((p: any) => ({
        ...p,
        visited_pc: !!checkinsMap[p.id]
    }));

    return {
        collaborators: collaborators.rows,
        users: assignedUsers.rows,
        stats: statsQuery.rows[0],
        voters: {
            data: finalVoters,
            total: parseInt(countQuery.rows[0].val),
            page,
            limit
        }
    };
}
