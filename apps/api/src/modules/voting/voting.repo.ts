import { query } from "../../db/query";

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
