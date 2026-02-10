import { query } from "../../db/query";

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
    `SELECT s.*,
        (SELECT COUNT(*) FROM persons p WHERE p.assigned_station_id = s.id AND p.campaign_id = $1) as assigned_count,
        (SELECT COUNT(*) FROM persons p WHERE p.assigned_station_id = s.id AND p.campaign_id = $1 AND (p.status_day_d = 'VOTED' OR p.has_voted = true)) as voted_count
     FROM stations s 
     WHERE s.campaign_id=$1 AND s.deleted_at IS NULL 
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
    await query(`UPDATE stations SET deleted_at = NOW(), status='DELETED' WHERE id=$1 AND campaign_id=$2`, [id, campaignId]);
    return { success: true };
}

export async function getStationStats(campaignId: string, stationId: string) {
  // 1. Total asignados (mock o real si existe tabla de asignación)
  // Por ahora, cuenta cuantos checkins únicos hubo hoy
  const totalCheckinsQuery = await query(
    `SELECT count(DISTINCT person_id) as val 
     FROM station_checkins 
     WHERE campaign_id=$1 AND station_id=$2 AND checkin_at::date=CURRENT_DATE`,
    [campaignId, stationId]
  );

  // 2. Cuantos de esos checkins ya tienen voto confirmado (Fuga de votos)
  // Join con persons para ver has_voted=true
  const votedCheckinsQuery = await query(
    `SELECT count(DISTINCT sc.person_id) as val
     FROM station_checkins sc
     JOIN persons p ON sc.person_id = p.id
     WHERE sc.campaign_id=$1 
       AND sc.station_id=$2 
       AND sc.checkin_at::date=CURRENT_DATE
       AND p.has_voted=true`,
    [campaignId, stationId]
  );

  return {
    total_checkins: parseInt(totalCheckinsQuery.rows[0].val),
    voted_checkins: parseInt(votedCheckinsQuery.rows[0].val)
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
         WHERE sc.campaign_id=$1 AND sc.station_id=$2 AND sc.checkin_at::date=CURRENT_DATE
         ORDER BY sc.checkin_at DESC`,
        [campaignId, stationId]
    );
    return res.rows;
}
export async function checkInToStation(campaignId: string, stationId: string, personId: string, userId: string) {
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
    return { success: (res.rowCount ?? 0) > 0 };
}

// --- TEAM MANAGEMENT ---

// --- TEAM MANAGEMENT ---

import { personCreate } from "../persons/persons.repo";
import { query as _query } from "../../db/query"; // Alias just in case, but we use 'query' imported above

export async function addCollaborator(campaignId: string, stationId: string, personId: string | null, role: string, citizenData?: any) {
    let targetPersonId = personId;

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
    await query(
        `DELETE FROM station_collaborators WHERE station_id=$1 AND person_id=$2`,
        [stationId, personId]
    );
    return { success: true };
}

// --- DASHBOARD ---

export async function getStationDashboard(campaignId: string, stationId: string, page: number = 1, limit: number = 50, search: string = '') {
    const offset = (page - 1) * limit;

    // 1. Collaborators
    const collaborators = await query(
        `SELECT sc.*, g.first_name, g.last_name, g.document_id
         FROM station_collaborators sc
         JOIN persons p ON sc.person_id = p.id
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE sc.station_id=$1`,
        [stationId]
    );

    // 2. Stats (Fixed: Uses station_checkins for visits)
    const statsQuery = await query(
        `SELECT 
            (SELECT COUNT(*) FROM persons WHERE assigned_station_id=$1 AND campaign_id=$2) as total_assigned,
            (SELECT COUNT(DISTINCT person_id) FROM station_checkins WHERE station_id=$1 AND campaign_id=$2 AND checkin_at::date = CURRENT_DATE) as total_visited_pc,
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

    const votersQuery = await query(
        `SELECT p.id, g.first_name, g.last_name, g.document_id, g.voting_table_number, 
                p.campaign_status, p.status_day_d, p.requests, p.notes,
                p.has_financial_needs, p.financial_amount, p.financial_needs_fulfilled,
                p.current_vote_intent
         FROM persons p
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE ${whereClause}
         ORDER BY g.last_name, g.first_name
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    
    // Total count for pagination
    const countQuery = await query(
        `SELECT COUNT(*) as val 
         FROM persons p 
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE ${whereClause}`,
        params
    );

    // Process Flags & Details efficiently
    const processedVoters = votersQuery.rows.map(v => {
        const reqs = v.requests || [];
        
        // Parse LOGISTICS
        const logReq = reqs.find((r:any) => r.type === 'LOGISTICS');
        const subtypes = logReq?.subtypes || [];
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
             WHERE station_id=$1 AND checkin_at::date = CURRENT_DATE 
             AND person_id = ANY($2::uuid[])`,
            [stationId, personIds]
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
        stats: statsQuery.rows[0],
        voters: {
            data: finalVoters,
            total: parseInt(countQuery.rows[0].val),
            page,
            limit
        }
    };
}
