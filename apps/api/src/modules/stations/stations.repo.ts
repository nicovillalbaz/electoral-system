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
  const res = await query(
    `SELECT * FROM stations WHERE campaign_id=$1 AND deleted_at IS NULL ORDER BY name`,
    [campaignId]
  );
  return res.rows;
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
    return { success: (res.rowCount ?? 0) > 0 };
}
