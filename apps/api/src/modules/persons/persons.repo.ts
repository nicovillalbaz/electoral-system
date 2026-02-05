import { query, pool } from "../../db/query";
import { logEvent } from "../events/events.repo";
// LISTAR TODO EL PADRÓN (Paginado + JOIN con Datos Reales)
// apps/api/src/modules/persons/persons.repo.ts

// En apps/api/src/modules/persons/persons.repo.ts

export async function personsList(
  campaignId: string,
  params: {
    q?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "ASC" | "DESC";
    address?: string;
    party?: string;
    voteIntent?: string;
    votedStatus?: string;
    campaignStatus?: string; 
    tagId?: string;
    hasRequests?: string;
    hasFinancialNeeds?: string;
    financialNeedsFulfilled?: string;
  },
) {
  const {
    q = "",
    page = 1,
    limit = 50,
    sortBy = "last_name",
    sortDir = "ASC",
  } = params;
  const offset = (page - 1) * limit;
  const like = `%${q}%`;

  const conditions = [`p.campaign_id = $1`];
  const queryParams: any[] = [campaignId];
  let paramIndex = 2;

  // 1. Buscador General
  if (q) {
    conditions.push(
      `(g.document_id ILIKE $${paramIndex} OR g.first_name ILIKE $${paramIndex} OR g.last_name ILIKE $${paramIndex})`,
    );
    queryParams.push(like);
    paramIndex++;
  }

  // 2. FILTRO DE ZONA INTELIGENTE
  if (params.address) {
    if (params.address === "B° CRISTÓBAL COLÓN") {
      conditions.push(`g.address ILIKE '%COLON%'`);
    } else if (params.address === "B° CENTRO") {
      conditions.push(
        `(g.address ILIKE '%CENTRO%' OR g.address ILIKE '%CASCO%')`,
      );
    } else if (params.address === "B° YBYHANGUY 1") {
      conditions.push(
        `(g.address ILIKE '%YBY%' OR g.address ILIKE '%YVY%') AND (g.address ILIKE '%1%' OR g.address ILIKE '%I%')`,
      );
    } else if (params.address === "B° YBYHANGUY 2") {
      conditions.push(
        `(g.address ILIKE '%YBY%' OR g.address ILIKE '%YVY%') AND (g.address ILIKE '%2%' OR g.address ILIKE '%II%')`,
      );
    } else if (params.address === "B° PIRAYU'I") {
      conditions.push(`g.address ILIKE '%PIRAYU%'`);
    } else if (params.address === "B° HERIBERTA MATIAUDA") {
      conditions.push(`g.address ILIKE '%MATIAUDA%'`);
    } else if (params.address === "B° CIERVO CUA") {
      conditions.push(`g.address ILIKE '%CIERVO%'`);
    } else if (params.address === "B° SANTA LIBRADA") {
      conditions.push(`g.address ILIKE '%LIBRADA%'`);
    } else if (params.address === "B° SANTA ROSALINA") {
      conditions.push(
        `(g.address ILIKE '%ROSALINA%' OR g.address ILIKE '%ROSA DE LIMA%')`,
      );
    } else if (params.address === "B° PUERTA DEL LAGO") {
      conditions.push(
        `(g.address ILIKE '%PUERTA%' OR g.address ILIKE '%LAGO%')`,
      );
    } else {
      conditions.push(`g.address = $${paramIndex}`);
      queryParams.push(params.address);
      paramIndex++;
    }
  }

  // 3. Filtro Partido
  if (params.party && params.party !== "TODOS") {
    conditions.push(`g.party_affiliation = $${paramIndex}`);
    queryParams.push(params.party);
    paramIndex++;
  }

  // 4. Filtro Intención
  if (params.voteIntent && params.voteIntent !== "ALL") {
    conditions.push(`p.current_vote_intent = $${paramIndex}`);
    queryParams.push(params.voteIntent);
    paramIndex++;
  }

  // 5. Filtro Ya Votó
  if (params.votedStatus === "VOTED") conditions.push(`p.has_voted = true`);
  if (params.votedStatus === "PENDING") conditions.push(`p.has_voted = false`);

  // 6. Filtro ESTADO/BITÁCORA (Corregido)
  if (params.campaignStatus && params.campaignStatus !== "ALL") {
    conditions.push(`p.campaign_status = $${paramIndex}`);
    queryParams.push(params.campaignStatus);
    paramIndex++;
  }

  // 7. Filtro Etiqueta
  if (params.tagId) {
    conditions.push(
      `EXISTS (SELECT 1 FROM person_tags pt WHERE pt.person_id = p.id AND pt.tag_id = $${paramIndex})`,
    );
    queryParams.push(params.tagId);
    paramIndex++;
  }

  // 8. Filtro Pedidos (Tiene pedidos?)
  if (params.hasRequests === 'true') {
      conditions.push(`jsonb_array_length(p.requests) > 0`);
  }

  // 9. Filtro Solicitud Financiera
  if (params.hasFinancialNeeds && params.hasFinancialNeeds !== 'ALL') {
      const val = params.hasFinancialNeeds === 'true';
      conditions.push(`p.has_financial_needs = $${paramIndex}`);
      queryParams.push(val);
      paramIndex++;
  }

  // 10. Filtro Ayuda Entregada
  if (params.financialNeedsFulfilled && params.financialNeedsFulfilled !== 'ALL') {
      const val = params.financialNeedsFulfilled === 'true';
      conditions.push(`p.financial_needs_fulfilled = $${paramIndex}`);
      queryParams.push(val);
      paramIndex++;
  }

  // Ordenamiento
  let orderByClause = "g.last_name";
  switch (sortBy) {
    case "document_id":
      orderByClause = `CAST(NULLIF(g.document_id, '') AS BIGINT)`;
      break;
    case "voting_order_number":
      orderByClause = "g.voting_order_number";
      break;
    case "address":
      orderByClause = "g.address";
      break;
    case "party_affiliation":
      orderByClause = "g.party_affiliation";
      break;
    case "current_vote_intent":
      orderByClause = "p.current_vote_intent";
      break;
    default:
      orderByClause = "g.last_name";
  }

  // --- CONSULTA FINAL CON COLUMNAS DE UBICACIÓN AGREGADAS ---
  const sql = `
    SELECT 
        p.id, 
        p.current_vote_intent, 
        p.has_voted, 
        p.is_visited, 
        p.notes,
        
        -- 👇 ¡AGREGAR ESTAS 3 LÍNEAS! 👇
        p.campaign_status,
        p.needs_transport,
        p.transport_status,
        -- 👆 ------------------------ 👆

        -- NUEVOS CAMPOS DE PEDIDOS Y FINANZAS --
        p.requests,
        p.has_financial_needs,
        p.financial_needs_fulfilled,
        p.financial_amount,
        -----------------------------------------

        g.document_id, 
        g.first_name, 
        g.last_name, 
        g.address, 
        g.party_affiliation, 
        g.voting_order_number, 
        g.phone_number, 
        g.voting_table_number,
        g.location_department, 
        g.location_district, 
        g.location_place,
        count(*) OVER() as full_count
    FROM persons p
    JOIN global_citizens g ON p.citizen_id = g.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${orderByClause} ${sortDir}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryParams.push(limit, offset);

  const res = await query(sql, queryParams);

  return {
    data: res.rows,
    total: res.rows.length > 0 ? Number(res.rows[0].full_count) : 0,
  };
}

// OBTENER UNA (JOIN Global + Local)
export async function personGet(campaignId: string, id: string) {
  // Actualizamos la consulta para ser explícitos con las columnas de ubicación
  return query(
    `SELECT 
        p.*, 
        g.document_id, g.first_name, g.last_name, g.address, g.party_affiliation, 
        g.phone_number, g.sex,
        -- Datos Electorales Específicos
        g.location_department,
        g.location_district,
        g.location_place,
        g.voting_table_number,
        g.voting_order_number,
        -- Asegurar campos nuevos también aquí aunque p.* debería traerlos, ser explícito ayuda
        p.requests, p.has_financial_needs, p.financial_needs_fulfilled, p.financial_amount
     FROM persons p 
     JOIN global_citizens g ON p.citizen_id = g.id 
     WHERE p.campaign_id = $1 AND p.id = $2`,
    [campaignId, id],
  );
}

// CREAR (Transacción Maestra)
export async function personCreate(campaignId: string, data: any) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upsert en Global Citizens
    const citizenRes = await client.query(
      `INSERT INTO global_citizens (
          document_id, first_name, last_name, party_affiliation, 
          phone_number, location_department, location_district, location_place, 
          voting_table_number, voting_order_number, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (document_id) DO UPDATE SET 
         first_name = COALESCE(EXCLUDED.first_name, global_citizens.first_name),
         last_name = COALESCE(EXCLUDED.last_name, global_citizens.last_name),
         phone_number = COALESCE(EXCLUDED.phone_number, global_citizens.phone_number),
         updated_at = NOW()
       RETURNING id`,
      [
        data.documentId,
        data.firstName,
        data.lastName,
        data.partyAffiliation || "ANR", // Por defecto según tu esquema
        data.phoneNumber, // <--- NUEVO
        data.department, // desc_dep
        data.district, // desc_dis
        data.pollingPlace, // desc_locanr
        data.tableNumber, // mesa
        data.orderNumber, // orden
      ],
    );
    const citizenId = citizenRes.rows[0].id;

    // 2. Vincular a Campaña
    const personRes = await client.query(
      `INSERT INTO persons (campaign_id, citizen_id, current_vote_intent, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (campaign_id, citizen_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, campaign_id, current_vote_intent, notes`,
      [
        campaignId,
        citizenId,
        data.currentVoteIntent ?? "UNDECIDED",
        data.notes ?? null,
      ],
    );

    await client.query("COMMIT");

    return {
      ...personRes.rows[0],
      document_id: data.documentId,
      first_name: data.firstName,
      last_name: data.lastName,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ACTUALIZAR
// ... imports ...
// ACTUALIZAR
// ... imports ...
const sanitize = (val: any) => (val === "" || val === undefined ? null : val);
export async function personUpdate(
  campaignId: string,
  personId: string,
  patch: any,
  actorUserId?: string,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Obtener datos actuales (Snapshot para el historial)
    const currentRes = await client.query(
      `SELECT p.current_vote_intent, p.notes, p.campaign_status, 
                p.needs_transport, p.transport_status, p.exact_address, p.whatsapp_number, p.assigned_station_id,
                g.phone_number, g.address, g.location_place 
         FROM persons p
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE p.id = $1`,
      [personId],
    );

    if (currentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const before = currentRes.rows[0];

    // 2. Actualizar Global Citizens (Datos Personales Básicos y Barrio)
    if (
      patch.firstName ||
      patch.lastName ||
      patch.phoneNumber ||
      patch.address ||
      patch.pollingPlace
    ) {
      await client.query(
        `UPDATE global_citizens 
         SET phone_number = COALESCE($1, phone_number),
             address = COALESCE($2, address),
             updated_at = NOW()
         FROM persons p
         WHERE global_citizens.id = p.citizen_id AND p.id = $3`,
        [patch.phoneNumber, patch.address, personId],
      );
    }

    // 3. Actualizar Persons (Datos Campaña + Nuevos Campos)
    if (
      patch.currentVoteIntent !== undefined ||
      patch.notes !== undefined ||
      patch.campaignStatus !== undefined ||
      patch.transportStatus !== undefined ||
      patch.needsTransport !== undefined ||
      patch.exactAddress !== undefined ||
      patch.whatsappNumber !== undefined ||
      patch.assignedStationId !== undefined ||
      // Nuevos
      patch.requests !== undefined ||
      patch.hasFinancialNeeds !== undefined ||
      patch.financialNeedsFulfilled !== undefined ||
      patch.financialAmount !== undefined
    ) {
      await client.query(
        `UPDATE persons 
         SET current_vote_intent = COALESCE($1, current_vote_intent),
             notes = COALESCE($2, notes),
             campaign_status = COALESCE($3, campaign_status),
             needs_transport = COALESCE($4, needs_transport),
             transport_status = COALESCE($5, transport_status),
             exact_address = COALESCE($6, exact_address),
             whatsapp_number = COALESCE($7, whatsapp_number),
             assigned_station_id = COALESCE($8, assigned_station_id),
             
             -- Nuevos Campos
             requests = COALESCE($9, requests),
             has_financial_needs = COALESCE($10, has_financial_needs),
             financial_needs_fulfilled = COALESCE($11, financial_needs_fulfilled),
             financial_amount = COALESCE($12, financial_amount),

             updated_at = NOW()
         WHERE id = $13 AND campaign_id = $14`,
        [
          sanitize(patch.currentVoteIntent), 
          patch.notes,
          sanitize(patch.campaignStatus), 
          patch.needsTransport,
          sanitize(patch.transportStatus),
          patch.exactAddress, // Campo Nuevo
          patch.whatsappNumber, // Campo Nuevo
          sanitize(patch.assignedStationId), // Campo Nuevo
          
          patch.requests ? JSON.stringify(patch.requests) : null, // Assuming patch.requests is array or null
          patch.hasFinancialNeeds,
          patch.financialNeedsFulfilled,
          patch.financialAmount,

          personId,
          campaignId,
        ],
      );
    }

    // 4. Historial (Log de cambios preciso)
    const changes: string[] = [];

    const newVote = sanitize(patch.currentVoteIntent);
    const newStatus = sanitize(patch.campaignStatus);

    if (patch.phoneNumber && patch.phoneNumber !== before.phone_number) changes.push(`Teléfono actualizado`);
    if (patch.address && patch.address !== before.address) changes.push(`Barrio actualizado`);
    
    // Logs nuevos
    if (patch.exactAddress && patch.exactAddress !== before.exact_address) changes.push(`Dir. Exacta actualizada`);
    if (patch.whatsappNumber && patch.whatsappNumber !== before.whatsapp_number) changes.push(`WhatsApp actualizado`);
    if (patch.assignedStationId && patch.assignedStationId !== before.assigned_station_id) changes.push(`Puesto asignado`);

    if (newVote !== undefined && newVote !== before.current_vote_intent) {
      changes.push(`Intención: ${newVote || "Indeciso"}`);
    }

    if (newStatus !== undefined && newStatus !== before.campaign_status) {
      changes.push(`Estado: ${newStatus || "Sin visitar"}`);
    }

    // Logs Nuevos Financieros
    if (patch.hasFinancialNeeds !== undefined && patch.hasFinancialNeeds !== before.has_financial_needs) {
         changes.push(patch.hasFinancialNeeds ? "Solicitó Aporte" : "Canceló Solicitud Aporte");
    }
    if (patch.financialNeedsFulfilled !== undefined && patch.financialNeedsFulfilled !== before.financial_needs_fulfilled) {
         changes.push(patch.financialNeedsFulfilled ? "Aporte Entregado" : "Aporte Pendiente");
    }
    if (patch.financialAmount !== undefined && patch.financialAmount !== before.financial_amount) {
         changes.push(`Monto Aporte: ${patch.financialAmount}`);
    }
    if (patch.requests && JSON.stringify(patch.requests) !== JSON.stringify(before.requests || [])) {
         changes.push("Lista de Pedidos actualizada");
    }

    if (
      patch.needsTransport !== undefined &&
      patch.needsTransport !== before.needs_transport
    ) {
      changes.push(
        patch.needsTransport ? "Solicitó transporte" : "Canceló transporte",
      );
    }

    if (changes.length > 0 && actorUserId) {
      await logEvent({
        campaignId,
        eventType: "PERSON_UPDATED",
        actorUserId,
        personId,
        payload: { details: changes.join(", ") },
      });
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// OBTENER DIRECCIONES ÚNICAS (Para el filtro desplegable)
export async function personsGetUniqueAddresses(campaignId: string) {
  const sql = `
    SELECT DISTINCT
      CASE 
        -- 1. Agrupación de zonas conocidas (Limpieza del caos)
        WHEN g.address ILIKE '%COLON%' THEN 'B° CRISTÓBAL COLÓN'
        WHEN g.address ILIKE '%CENTRO%' OR g.address ILIKE '%CASCO%' THEN 'B° CENTRO'
        WHEN (g.address ILIKE '%YBY%' OR g.address ILIKE '%YVY%' OR g.address ILIKE '%YBU%') AND (g.address ILIKE '%1%' OR g.address ILIKE '%I%') THEN 'B° YBYHANGUY 1'
        WHEN (g.address ILIKE '%YBY%' OR g.address ILIKE '%YVY%' OR g.address ILIKE '%YBU%') AND (g.address ILIKE '%2%' OR g.address ILIKE '%II%') THEN 'B° YBYHANGUY 2'
        WHEN g.address ILIKE '%PIRAYU%' THEN 'B° PIRAYU''I'
        WHEN g.address ILIKE '%MATIAUDA%' THEN 'B° HERIBERTA MATIAUDA'
        WHEN g.address ILIKE '%CIERVO%' THEN 'B° CIERVO CUA'
        WHEN g.address ILIKE '%LIBRADA%' THEN 'B° SANTA LIBRADA'
        WHEN g.address ILIKE '%ROSALINA%' OR g.address ILIKE '%ROSA DE LIMA%' THEN 'B° SANTA ROSALINA'
        WHEN g.address ILIKE '%PUERTA%' OR g.address ILIKE '%LAGO%' THEN 'B° PUERTA DEL LAGO'
        WHEN g.address ILIKE '%MERCEDES%' THEN 'B° LAS MERCEDES'
        WHEN g.address ILIKE '%SAN MIGUEL%' THEN 'B° SAN MIGUEL'
        WHEN g.address ILIKE '%STO DOMINGO%' OR g.address ILIKE '%SANTO DOMINGO%' THEN 'B° SANTO DOMINGO'
        
        -- 2. "APRENDIZAJE": Si la dirección empieza formalmente, la aceptamos como nueva zona
        WHEN g.address ILIKE 'B° %' OR g.address ILIKE 'BARRIO %' THEN UPPER(g.address)
        
        -- 3. Todo lo demás (Calles sueltas, números, etc.) se agrupa para no ensuciar
        ELSE 'OTRAS ZONAS'
      END as clean_zone
    FROM persons p
    JOIN global_citizens g ON p.citizen_id = g.id
    WHERE p.campaign_id = $1 
      AND g.address IS NOT NULL 
      AND length(g.address) > 2
    ORDER BY clean_zone ASC
  `;

  const res = await query(sql, [campaignId]);

  // Devolvemos la lista única limpia
  return res.rows.map((r) => r.clean_zone).filter((z) => z !== "OTRAS ZONAS");
}
