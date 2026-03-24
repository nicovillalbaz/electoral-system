import { query, pool } from "../../db/query";
import { badRequest } from "../../common/http/errors";
import { logEvent } from "../events/events.repo";
import { taskCreate } from "../tasks/tasks.repo";
import { createNotification } from "../notifications/notifications.repo";

const campaignHierarchyScope = (paramIndex: number, alias = "p") =>
  `(${alias}.campaign_id = $${paramIndex} OR ${alias}.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $${paramIndex}))`;


const normalizedCitizenAddressSql =
  "TRIM(UPPER(REGEXP_REPLACE(g.address, '\\s+', ' ', 'g')))";

const normalizeAddressFilter = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};
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
    assignedUserId?: string;
    needsTransport?: string;
    transportStatus?: string;
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

  const conditions = [campaignHierarchyScope(1, "p"), `p.deleted_at IS NULL`];
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
    const normalizedAddress = normalizeAddressFilter(params.address);
    if (normalizedAddress) {
      conditions.push(`${normalizedCitizenAddressSql} = $${paramIndex}`);
      queryParams.push(normalizedAddress);
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

  // 8. Filtro Responsable/Puntero
  if (params.assignedUserId && params.assignedUserId !== "ALL") {
    if (params.assignedUserId === "__UNASSIGNED__") {
      conditions.push(`p.assigned_user_id IS NULL`);
    } else {
      conditions.push(`p.assigned_user_id = $${paramIndex}`);
      queryParams.push(params.assignedUserId);
      paramIndex++;
    }
  }

  // 9. Filtro Pedidos (Tiene pedidos?)
  if (params.needsTransport && params.needsTransport !== "ALL") {
      const val = params.needsTransport === "true";
      conditions.push(`p.needs_transport = $${paramIndex}`);
      queryParams.push(val);
      paramIndex++;
  }

  if (params.transportStatus && params.transportStatus !== "ALL") {
      conditions.push(`p.transport_status = $${paramIndex}`);
      queryParams.push(params.transportStatus);
      paramIndex++;
  }

  // 10. Filtro Pedidos (Tiene pedidos?)
  if (params.hasRequests === 'true') {
      conditions.push(`jsonb_array_length(p.requests) > 0`);
  }

  // 11. Filtro Solicitud Financiera
  if (params.hasFinancialNeeds && params.hasFinancialNeeds !== 'ALL') {
      const val = params.hasFinancialNeeds === 'true';
      conditions.push(`p.has_financial_needs = $${paramIndex}`);
      queryParams.push(val);
      paramIndex++;
  }

  // 12. Filtro Ayuda Entregada
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
    case "phone_number":
      orderByClause = "g.phone_number";
      break;
    case "voting_table_number":
      orderByClause = "g.voting_table_number";
      break;
    case "location_department":
      orderByClause = "g.location_department";
      break;
    case "location_district":
      orderByClause = "g.location_district";
      break;
    case "location_place":
      orderByClause = "g.location_place";
      break;
    case "campaign_status":
      orderByClause = "p.campaign_status";
      break;
    case "assigned_station_id":
      orderByClause = "p.assigned_station_id";
      break;
    case "assigned_user_id":
      orderByClause = "p.assigned_user_id";
      break;
    case "financial_amount":
      orderByClause = "p.financial_amount";
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
        p.assigned_station_id,
        p.assigned_user_id,
        p.exact_address,
        p.whatsapp_number,
        p.status_day_d,
        p.station_checkin_at,
        -----------------------------------------

        g.document_id, 
        g.first_name, 
        g.last_name, 
        g.address, 
        g.party_affiliation, 
        g.party_affiliation_date,
        g.birthdate,
        g.sex,
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
     WHERE ${campaignHierarchyScope(1, "p")} AND p.id = $2 AND p.deleted_at IS NULL`,
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
          phone_number, address, location_department, location_district, location_place, 
          voting_table_number, voting_order_number, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (document_id) DO UPDATE SET 
         first_name = COALESCE(EXCLUDED.first_name, global_citizens.first_name),
         last_name = COALESCE(EXCLUDED.last_name, global_citizens.last_name),
         phone_number = COALESCE(EXCLUDED.phone_number, global_citizens.phone_number),
         address = COALESCE(EXCLUDED.address, global_citizens.address),
         updated_at = NOW()
       RETURNING id`,
      [
        data.documentId,
        data.firstName,
        data.lastName,
        data.partyAffiliation || "ANR", // Por defecto según tu esquema
        data.phoneNumber, // <--- NUEVO
        data.address ?? null,
        data.department, // desc_dep
        data.district, // desc_dis
        data.pollingPlace, // desc_locanr
        data.tableNumber, // mesa
        data.orderNumber, // orden
      ],
    );
    const citizenId = citizenRes.rows[0].id;

    // 2. Vincular a Campaña
    const campaignStatus = data.campaignStatus || "NOT_VISITED";
    const assignedStationId = data.assignedStationId || null;
    const assignedUserId = data.assignedUserId || null;
    const requests = Array.isArray(data.requests) ? JSON.stringify(data.requests) : "[]";
    const hasFinancialNeeds = data.hasFinancialNeeds ?? false;
    const financialNeedsFulfilled = data.financialNeedsFulfilled ?? false;
    const financialAmount = data.financialAmount ?? 0;
    const needsTransport = data.needsTransport ?? false;
    const transportStatus = data.transportStatus || "PENDING";

    const personRes = await client.query(
      `INSERT INTO persons (
          campaign_id,
          citizen_id,
          current_vote_intent,
          notes,
          exact_address,
          whatsapp_number,
          campaign_status,
          assigned_station_id,
          assigned_user_id,
          requests,
          has_financial_needs,
          financial_needs_fulfilled,
          financial_amount,
          needs_transport,
          transport_status,
          created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, NOW())
       ON CONFLICT (campaign_id, citizen_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, campaign_id, current_vote_intent, notes`,
      [
        campaignId,
        citizenId,
        data.currentVoteIntent ?? "UNDECIDED",
        data.notes ?? null,
        data.exactAddress ?? null,
        data.whatsappNumber ?? null,
        campaignStatus,
        assignedStationId,
        assignedUserId,
        requests,
        hasFinancialNeeds,
        financialNeedsFulfilled,
        financialAmount,
        needsTransport,
        transportStatus,
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
                p.needs_transport, p.transport_status, p.exact_address, p.whatsapp_number, p.assigned_station_id, p.assigned_user_id,
                p.has_financial_needs, p.financial_needs_fulfilled,
                g.phone_number, g.address, g.location_place, g.first_name, g.last_name
         FROM persons p
         JOIN global_citizens g ON p.citizen_id = g.id
         WHERE p.id = $1 AND ${campaignHierarchyScope(2, "p")} AND p.deleted_at IS NULL`,
      [personId, campaignId],
    );

    if (currentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const before = currentRes.rows[0];

    if (patch.hasFinancialNeeds === false && before.financial_needs_fulfilled) {
      throw badRequest("No se puede desactivar un aporte ya entregado.");
    }

    // 2. Actualizar Global Citizens (Datos Personales Básicos y Barrio y AFILIACIÓN)
    if (
      patch.firstName !== undefined ||
      patch.lastName !== undefined ||
      patch.phoneNumber !== undefined ||
      patch.address !== undefined ||
      patch.pollingPlace !== undefined ||
      patch.partyAffiliation !== undefined // <--- Nuevo
    ) {
      await client.query(
        `UPDATE global_citizens 
         SET phone_number = COALESCE($1, phone_number),
             address = COALESCE($2, address),
             party_affiliation = COALESCE($3, party_affiliation),
             updated_at = NOW()
         FROM persons p
         WHERE global_citizens.id = p.citizen_id
           AND p.id = $4
           AND ${campaignHierarchyScope(5, "p")}`,
        [
          patch.phoneNumber,
          patch.address,
          patch.partyAffiliation,
          personId,
          campaignId,
        ],
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
      patch.financialAmount !== undefined ||
      patch.assignedUserId !== undefined
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
             financial_amount = COALESCE($11, financial_amount),
             assigned_user_id = COALESCE($12, assigned_user_id),

             updated_at = NOW()
         WHERE id = $13 AND ${campaignHierarchyScope(14, "persons")}`,
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
          patch.financialAmount,
          sanitize(patch.assignedUserId),

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
    if (patch.partyAffiliation && patch.partyAffiliation !== before.party_affiliation) changes.push(`Afiliación: ${patch.partyAffiliation}`); // <--- Log
    
    // Logs nuevos
    if (patch.exactAddress && patch.exactAddress !== before.exact_address) changes.push(`Dir. Exacta actualizada`);
    if (patch.whatsappNumber && patch.whatsappNumber !== before.whatsapp_number) changes.push(`WhatsApp actualizado`);
    if (patch.assignedStationId && patch.assignedStationId !== before.assigned_station_id) changes.push(`Puesto asignado`);
    if (patch.assignedUserId && patch.assignedUserId !== before.assigned_user_id) {
        changes.push(`Responsable asignado`);
        // Notify
        if (patch.assignedUserId) {
            await createNotification({
                campaignId: campaignId,
                userId: patch.assignedUserId,
                message: `Te han asignado a ${before.first_name} ${before.last_name} como responsable.`,
                type: 'VOTER_ASSIGNED',
                link: `/dashboard/persons?q=${before.document_id}`
            });
        }
    }

    if (newVote !== undefined && newVote !== before.current_vote_intent) {
      changes.push(`Intención: ${newVote || "Indeciso"}`);
    }

    if (newStatus !== undefined && newStatus !== before.campaign_status) {
      changes.push(`Estado: ${newStatus || "Sin visitar"}`);
    }

    // Logs Nuevos Financieros
    if (patch.hasFinancialNeeds !== undefined && patch.hasFinancialNeeds !== before.has_financial_needs) {
         changes.push(patch.hasFinancialNeeds ? "Solicitó Aporte" : "Canceló Solicitud Aporte");
         
         // AUTOMATIC TASK CREATION (FINANCIAL)
         if (patch.hasFinancialNeeds && actorUserId) {
            await taskCreate(campaignId, actorUserId, {
                title: `Viático / Aporte (${before.first_name} ${before.last_name})`,
                description: `Solicitado desde Control Día D.\nMonto: ${patch.financialAmount || before.financial_amount || 0} Gs.\nNotas: ${patch.notes || before.notes || ''}`,
                priority: 'URGENT',
                taskType: 'FINANCIAL', // Ensure 'FINANCIAL' or 'EVENT' exists in enum, mapping to 'EVENT' if needed or assuming 'FINANCIAL' added
                relatedPersonId: personId
            });
         }
    }
    if (patch.financialAmount !== undefined && patch.financialAmount !== before.financial_amount) {
         changes.push(`Monto Aporte: ${patch.financialAmount}`);
    }
    if (patch.requests && JSON.stringify(patch.requests) !== JSON.stringify(before.requests || [])) {
         const oldReqs = (before.requests || []) as any[];
         const newReqs = patch.requests as any[]; // Array of { type, detail, assignedUserId, ... } or strings

         // Helper to unify format
         const normalize = (r: any) => {
           if (typeof r === 'string') return { type: 'LOGISTICS', detail: r };
           const detail =
             r?.detail ??
             (Array.isArray(r?.subtypes) ? r.subtypes.filter(Boolean).join(", ") : r?.subtypes) ??
             r?.description ??
             r?.value ??
             "";
           return { ...r, type: r?.type || 'LOGISTICS', detail };
         };
         
         // Find strictly new requests (not present in old)
         // We use JSON stringify for simple object comparison
         const addedReqs = newReqs.filter(nr => 
            !oldReqs.some(or => JSON.stringify(normalize(or)) === JSON.stringify(normalize(nr)))
         );

         for (const req of addedReqs) {
             const n = normalize(req);
             const detailText = n.detail || "Sin detalle";
             changes.push(`Solicitó (${n.type}): ${detailText}`);
             
             // AUTOMATIC TASK CREATION
             if (n.assignedUserId && actorUserId) {
                 const phone = patch.phoneNumber ?? before.phone_number ?? 'N/A';
                 const address = patch.address ?? before.address ?? 'N/A';
                 const exact = patch.exactAddress ?? before.exact_address ?? '';
                 await taskCreate(campaignId, actorUserId, {
                     title: `${n.type}: ${detailText} (${before.first_name} ${before.last_name})`,
                     description: `Solicitud asignada desde asignación directa.\n\nDetalle: ${detailText}\nCategoría: ${n.type}\n\nDatos de Contacto:\nCel: ${phone}\nDir: ${address}\nRef: ${exact}`,
                     priority: 'URGENT',
                     taskType: 'LOGISTICS',
                     dueDate: new Date(), // Today
                     assignedUserId: n.assignedUserId, // <--- THE KEY CHANGE
                     relatedPersonId: personId
                 });
                 // Notification? taskCreate might handle it, or we add one? 
                 // taskCreate usually notifies assignee.
             }
         }
         
         if (addedReqs.length === 0 && newReqs.length < oldReqs.length) {
             changes.push("Se eliminaron pedidos/solicitudes");
         }
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
    SELECT DISTINCT ${normalizedCitizenAddressSql} AS normalized_address
    FROM persons p
    JOIN global_citizens g ON p.citizen_id = g.id
    WHERE ${campaignHierarchyScope(1, "p")}
      AND p.deleted_at IS NULL
      AND g.address IS NOT NULL
      AND NULLIF(TRIM(g.address), '') IS NOT NULL
    ORDER BY normalized_address ASC
  `;

  const res = await query(sql, [campaignId]);
  return res.rows
    .map((r) => r.normalized_address as string | null)
    .filter((address): address is string => !!address);
}

// MASIVE UPDATE
export async function personsBulkUpdate(
  campaignId: string,
  filterParams: any,
  updates: any,
  actorUserId: string
) {
  // Validate allowed keys in updates object
  const allowedKeys = [
      "campaign_status", "current_vote_intent", "assigned_user_id", "assigned_station_id", 
      "transport_status", "needs_transport", "has_voted",
      "add_tag", "add_note", "add_request", "financial_amount"
  ];
  
  const updateKeys = Object.keys(updates);
  if (updateKeys.some(k => !allowedKeys.includes(k))) {
      throw new Error("Invalid field in bulk update: " + updateKeys.find(k => !allowedKeys.includes(k)));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Build Conditions (Duplicated from personsList)
    const conditions = [campaignHierarchyScope(1, "p"), `p.deleted_at IS NULL`];
    const queryParams: any[] = [campaignId];
    let paramIndex = 2; // $1 is campaignId

    if (filterParams.q) {
      conditions.push(`(g.document_id ILIKE $${paramIndex} OR g.first_name ILIKE $${paramIndex} OR g.last_name ILIKE $${paramIndex})`);
      queryParams.push(`%${filterParams.q}%`);
      paramIndex++;
    }

    if (filterParams.address) {
       const normalizedAddress = normalizeAddressFilter(filterParams.address);
       if (normalizedAddress) {
          conditions.push(`${normalizedCitizenAddressSql} = $${paramIndex}`);
          queryParams.push(normalizedAddress);
          paramIndex++;
       }
    }

    if (filterParams.party && filterParams.party !== "TODOS") {
      conditions.push(`g.party_affiliation = $${paramIndex}`);
      queryParams.push(filterParams.party);
      paramIndex++;
    }

    if (filterParams.voteIntent && filterParams.voteIntent !== "ALL") {
      conditions.push(`p.current_vote_intent = $${paramIndex}`);
      queryParams.push(filterParams.voteIntent);
      paramIndex++;
    }

    if (filterParams.votedStatus === "VOTED") conditions.push(`p.has_voted = true`);
    if (filterParams.votedStatus === "PENDING") conditions.push(`p.has_voted = false`);

    if (filterParams.campaignStatus && filterParams.campaignStatus !== "ALL") {
      conditions.push(`p.campaign_status = $${paramIndex}`);
      queryParams.push(filterParams.campaignStatus);
      paramIndex++;
    }

    if (filterParams.tagId) {
      conditions.push(`EXISTS (SELECT 1 FROM person_tags pt WHERE pt.person_id = p.id AND pt.tag_id = $${paramIndex})`);
      queryParams.push(filterParams.tagId);
      paramIndex++;
    }

    const assignedUserFilter = filterParams.assignedUserId ?? filterParams.assigned_user_id;
    if (assignedUserFilter && assignedUserFilter !== "ALL") {
      if (assignedUserFilter === "__UNASSIGNED__") {
        conditions.push(`p.assigned_user_id IS NULL`);
      } else {
        conditions.push(`p.assigned_user_id = $${paramIndex}`);
        queryParams.push(assignedUserFilter);
        paramIndex++;
      }
    }

    if (filterParams.hasRequests === 'true' || filterParams.hasRequests === true) {
        conditions.push(`jsonb_array_length(p.requests) > 0`);
    }

    if (filterParams.hasFinancialNeeds && filterParams.hasFinancialNeeds !== 'ALL') {
        const val = filterParams.hasFinancialNeeds === 'true';
        conditions.push(`p.has_financial_needs = $${paramIndex}`);
        queryParams.push(val);
        paramIndex++;
    }

    if (filterParams.financialNeedsFulfilled && filterParams.financialNeedsFulfilled !== 'ALL') {
        const val = filterParams.financialNeedsFulfilled === 'true';
        conditions.push(`p.financial_needs_fulfilled = $${paramIndex}`);
        queryParams.push(val);
        paramIndex++;
    }

    // 2. Perform Updates Sequentially for maximal flexibility
    // We iterate over keys and run specific queries. This is less efficient than one big UPDATE but supports complex logic (INSERT/APPEND).
    // Given usage frequency, this is acceptable. Or we can combine standard updates.

    // A. Standard Updates (One Query)
    const standardFields = ["campaign_status", "current_vote_intent", "assigned_user_id", "assigned_station_id", "transport_status", "needs_transport"];
    const standardUpdates: any = {};
    updateKeys.forEach(k => {
        if (standardFields.includes(k)) standardUpdates[k] = updates[k];
    });

    const standardUpdateCount = Object.keys(standardUpdates).length;

    if (standardUpdateCount > 0) {
        const setClauses: string[] = [];
        Object.entries(standardUpdates).forEach(([k, v]) => {
            setClauses.push(`${k} = $${paramIndex}`);
            queryParams.push(v === "" ? null : v);
            paramIndex++;
        });
        
        // FINANCIAL SPECIAL CASE (If standard-ish)
        // ... handled separately below for "financial_amount" key logic usually, but let's see.

        const sql = `
           UPDATE persons p
           SET ${setClauses.join(", ")}, updated_at = NOW()
           FROM global_citizens g
           WHERE p.citizen_id = g.id
             AND ${conditions.join(" AND ")}
        `;
        await client.query(sql, queryParams);
    }

    // B. Complex Updates (One by One)
    // We need to re-use conditions/params for subsequent queries, so let's reset or just append?
    // Actually, reusing the BASE conditions parameters is tricky if we keep pushing to queryParams.
    // Better strategy: Use a dedicated function/query builder for the WHERE clause to avoid index hell.
    // Hack: Just re-build the WHERE clause parameters for each complex query?
    // Or just use the already built queryParams for the WHERE part!
    
    // Re-building base params for complex queries:
    const baseParams = queryParams.slice(0, paramIndex - standardUpdateCount); // Remove the standard update values
    const baseCondition = conditions.join(" AND ");

    // Universal voted state: if one campaign marks voted, siblings and parent see the same voted reality.
    if (updates.has_voted !== undefined) {
         const voted =
           updates.has_voted === true ||
           updates.has_voted === "true" ||
           updates.has_voted === 1 ||
           updates.has_voted === "1";
         const votedParamIndex = baseParams.length + 1;
         const sql = `
           WITH target_citizens AS (
             SELECT DISTINCT p.citizen_id
             FROM persons p
             JOIN global_citizens g ON p.citizen_id = g.id
             WHERE ${baseCondition}
           )
           UPDATE persons p2
           SET has_voted = $${votedParamIndex},
               status_day_d = CASE
                 WHEN $${votedParamIndex}::boolean THEN 'VOTED'::day_d_status_enum
                 WHEN p2.status_day_d = 'VOTED'::day_d_status_enum THEN 'PENDING'::day_d_status_enum
                 ELSE p2.status_day_d
               END,
               updated_at = NOW()
            WHERE p2.citizen_id IN (SELECT citizen_id FROM target_citizens)
              AND ${campaignHierarchyScope(1, "p2")}
              AND p2.deleted_at IS NULL
         `;
        await client.query(sql, [...baseParams, voted]);
    }

    // ADD TAG
    if (updates.add_tag) {
         const pIdx = baseParams.length + 1;
         const pIdxAssigned = pIdx + 1;
         const sql = `
           INSERT INTO person_tags (campaign_id, person_id, tag_id, assigned_by_user_id)
           SELECT $1, p.id, $${pIdx}, $${pIdxAssigned}
           FROM persons p
           JOIN global_citizens g ON p.citizen_id = g.id
           WHERE ${baseCondition}
           ON CONFLICT DO NOTHING
        `;
        await client.query(sql, [...baseParams, updates.add_tag, actorUserId || null]);
    }

    // ADD NOTE
    if (updates.add_note) {
         const pIdx = baseParams.length + 1;
         const sql = `
           UPDATE persons p
           SET notes = COALESCE(notes, '') || E'\n' || $${pIdx}, updated_at = NOW()
           FROM global_citizens g
           WHERE p.citizen_id = g.id AND ${baseCondition}
        `;
        await client.query(sql, [...baseParams, updates.add_note]);
    }

    // ADD REQUEST
    if (updates.add_request) {
         const pIdx = baseParams.length + 1;
         const sql = `
           UPDATE persons p
           SET requests = COALESCE(requests, '[]'::jsonb) || $${pIdx}::jsonb, updated_at = NOW()
           FROM global_citizens g
           WHERE p.citizen_id = g.id AND ${baseCondition}
        `;
        // Ensure request is object or array? Implementation plan said object.
        await client.query(sql, [...baseParams, JSON.stringify(updates.add_request)]);
    }

    // FINANCIAL AMOUNT
    if (updates.financial_amount !== undefined) {
         const pIdx = baseParams.length + 1;
         const amountRaw = updates.financial_amount;
         const amount =
           amountRaw === "" || amountRaw === null || amountRaw === undefined
             ? 0
             : Number(amountRaw);
         if (Number.isNaN(amount)) {
           throw new Error("Invalid financial_amount");
         }
         const sql = `
           UPDATE persons p
           SET financial_amount = $${pIdx}::numeric, 
               has_financial_needs = ($${pIdx}::numeric > 0), 
               financial_needs_fulfilled = ($${pIdx}::numeric > 0),
               updated_at = NOW()
           FROM global_citizens g
           WHERE p.citizen_id = g.id AND ${baseCondition}
        `;
        await client.query(sql, [...baseParams, amount]);
    }

    // Count is hard to get exactly if multiple updates... estimate from first?
    // Let's return just success.

    await client.query("COMMIT");
    return { success: true };
    
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
