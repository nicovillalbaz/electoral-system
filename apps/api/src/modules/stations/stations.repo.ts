import { query } from "../../db/query";

export async function stationCreate(campaignId: string, data: any) {
  const res = await query(
    `INSERT INTO stations (campaign_id, name, status, city_id, zone_id, neighborhood_id, address)
     VALUES ($1,$2,'ACTIVE',$3,$4,$5,$6)
     RETURNING *`,
    [
      campaignId,
      data.name,
      data.cityId ?? null,
      data.zoneId ?? null,
      data.neighborhoodId ?? null,
      data.address ?? null,
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

export async function addCollaborator(campaignId: string, stationId: string, personId: string, role: string) {
    const res = await query(
        `INSERT INTO station_collaborators (station_id, person_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (station_id, person_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING *`,
        [stationId, personId, role]
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
        `SELECT sc.*, p.first_name, p.last_name, p.document_id
         FROM station_collaborators sc
         JOIN persons p ON sc.person_id = p.id
         WHERE sc.station_id=$1`,
        [stationId]
    );

    // 2. Stats (Simple aggregation)
    const statsQuery = await query(
        `SELECT 
            COUNT(*) FILTER (WHERE assigned_station_id=$1) as total_assigned,
            COUNT(*) FILTER (WHERE assigned_station_id=$1 AND campaign_status='VISITED_PC') as total_visited_pc,
            COUNT(*) FILTER (WHERE assigned_station_id=$1 AND (status_day_d='VOTED' OR has_voted=true)) as total_voted
         FROM persons
         WHERE campaign_id=$2`, 
        [stationId, campaignId]
    );
    // Note: The stats query implies we only count assigned people. If check-ins include people NOT assigned, we'd need a different query.
    // For now, focusing on the "Master Grid" of assigned people as requested.

    // 3. Voters (Paginated & Searched)
    let whereClause = `campaign_id=$1 AND assigned_station_id=$2`;
    const params: any[] = [campaignId, stationId];

    if (search) {
        whereClause += ` AND (first_name ILIKE $3 OR last_name ILIKE $3 OR document_id ILIKE $3)`;
        params.push(`%${search}%`);
    }

    const votersQuery = await query(
        `SELECT id, first_name, last_name, document_id, voting_table_number, 
                campaign_status, status_day_d, requests, notes,
                has_financial_needs, financial_amount, financial_needs_fulfilled,
                current_vote_intent
         FROM persons
         WHERE ${whereClause}
         ORDER BY last_name, first_name
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );
    
    // Total count for pagination
    const countQuery = await query(
        `SELECT COUNT(*) as val FROM persons WHERE ${whereClause}`,
        params
    );

    // Process Flags & Details efficiently
    const processedVoters = votersQuery.rows.map(v => {
        const reqs = v.requests || [];
        const logReq = reqs.find((r:any) => r.type === 'LOGISTICS');
        const subtypes = logReq?.subtypes || [];
        const logResponsible = logReq?.responsible || null;
        const logStatus = logReq?.status || 'PENDING';

        return {
            ...v,
            logistics: {
                has_needs: subtypes.length > 0,
                subtypes: subtypes,
                responsible: logResponsible,
                status: logStatus,
                // flags for quick icons
                has_fuel: subtypes.includes('FUEL'),
                has_transport: subtypes.includes('TRANSPORT'),
                has_snack: subtypes.includes('SNACK'),
                has_accompaniment: subtypes.includes('ACCOMPANIMENT'),
            },
            financial: {
                has_needs: v.has_financial_needs,
                amount: v.financial_amount,
                fulfilled: v.financial_needs_fulfilled
            }
        };
    });

    return {
        collaborators: collaborators.rows,
        stats: statsQuery.rows[0],
        voters: {
            data: processedVoters,
            total: parseInt(countQuery.rows[0].val),
            page,
            limit
        }
    };
}
