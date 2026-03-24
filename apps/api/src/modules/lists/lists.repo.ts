import { pool, query } from "../../db/query";

const normalizedCitizenAddressSql =
  "TRIM(UPPER(REGEXP_REPLACE(g.address, '\\s+', ' ', 'g')))";

const normalizeAddressFilter = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

export async function listCreate(campaignId: string, data: any) {
  const res = await query(
    `INSERT INTO lists (campaign_id, name, description, icon, filters, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [campaignId, data.name, data.description, data.icon, data.filters, data.isFavorite]
  );
  return res.rows[0];
}
export async function ensureSystemLists(campaignId: string) {
  const client = await pool.connect();
  try {
    // 1. Revisar si ya existen listas
    const check = await client.query(`SELECT count(*) FROM lists WHERE campaign_id = $1`, [campaignId]);
    if (parseInt(check.rows[0].count) > 0) return; // Ya tiene listas, no hacemos nada.

    // 2. Insertar listas por defecto
    const lists = [
      {
        name: "📍 Mis Vecinos Indecisos",
        icon: "map-pin",
        filters: { 
            voteIntent: "UNDECIDED", 
            // NOTA: El frontend deberá sustituir esto dinámicamente con el barrio del usuario logueado
            // O podemos dejarlo genérico como "Indecisos Generales" por ahora
            address: "" 
        }
      },
      {
        name: "📅 Meta Diaria (Por Visitar)",
        icon: "calendar",
        filters: { campaignStatus: "TO_VISIT" }
      },
      {
        name: "✅ Ya Votaron (Monitoreo)",
        icon: "check-circle",
        filters: { hasVoted: true } // Asumiendo que agregaremos este filtro al motor
      }
    ];

    for (const list of lists) {
      await client.query(
        `INSERT INTO lists (campaign_id, name, icon, filters, is_favorite) VALUES ($1, $2, $3, $4, true)`,
        [campaignId, list.name, list.icon, list.filters]
      );
    }
  } finally {
    client.release();
  }
}
export async function listsGetAll(campaignId: string, search?: string, limit: number = 50, offset: number = 0) {
  await ensureSystemLists(campaignId);

  let sql = `SELECT * FROM lists WHERE campaign_id = $1 AND deleted_at IS NULL`;
  const params: any[] = [campaignId];
  let paramIndex = 2;

  if (search) {
      sql += ` AND name ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
  }

  sql += ` ORDER BY is_favorite DESC, name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  return query(sql, params).then(r => r.rows);
}

export async function listGet(campaignId: string, id: string) {
  const res = await query(
    `SELECT * FROM lists WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL`,
    [id, campaignId]
  );
  return res.rows[0];
}

export async function listDelete(campaignId: string, id: string) {
  // Soft Delete
  await query(`UPDATE lists SET deleted_at = NOW() WHERE id = $1 AND campaign_id = $2`, [id, campaignId]);
  return { success: true };
}

// Actualizar (para cambiar nombre o filtros)
export async function listUpdate(campaignId: string, id: string, data: any) {
    // Construcción dinámica de update (simplificada)
    await query(
        `UPDATE lists 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             icon = COALESCE($3, icon),
             filters = COALESCE($4, filters),
             is_favorite = COALESCE($5, is_favorite),
             updated_at = NOW()
         WHERE id = $6 AND campaign_id = $7`,
        [data.name, data.description, data.icon, data.filters, data.isFavorite, id, campaignId]
    );
    return { success: true };
}

function buildSmartQuery(filters: any, baseParamIndex: number) {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = baseParamIndex;

  // 1. Filtro por BARRIO (Tabla global_citizens)
  if (filters.address && filters.address.trim() !== "") {
    const normalizedAddress = normalizeAddressFilter(filters.address);
    if (normalizedAddress) {
      conditions.push(`${normalizedCitizenAddressSql} = $${idx}`);
      values.push(normalizedAddress);
      idx++;
    }
  }

  // 2. Filtro por INTENCIÓN DE VOTO (Tabla persons)
  if (filters.voteIntent && filters.voteIntent.trim() !== "" && filters.voteIntent !== "ALL") {
    conditions.push(`p.current_vote_intent = $${idx}`);
    values.push(filters.voteIntent);
    idx++;
  }

  // 3. Filtro por ESTADO DE CAMPAÑA (Tabla persons)
  // Soportamos tanto camelCase (Frontend) como snake_case (Legacy/DB) por seguridad
  const cStatus = filters.campaignStatus || filters.campaign_status;
  if (cStatus && cStatus !== "ALL") {
    conditions.push(`p.campaign_status = $${idx}`);
    values.push(cStatus);
    idx++;
  }

  // 4. Filtro por PARTIDO (Tabla global_citizens)
  if (filters.party && filters.party.trim() !== "" && filters.party !== "TODOS") {
    conditions.push(`g.party_affiliation = $${idx}`);
    values.push(filters.party);
    idx++;
  }

  // 5. Filtro por ETIQUETA (Lógica especial Many-to-Many)
  if (filters.tagId && filters.tagId.trim() !== "") {
    conditions.push(`EXISTS (
      SELECT 1 FROM person_tags pt 
      WHERE pt.person_id = p.id AND pt.tag_id = $${idx}
    )`);
    values.push(filters.tagId);
    idx++;
  }

  const assignedUserFilter = filters.assignedUserId || filters.assigned_user_id;
  if (assignedUserFilter && assignedUserFilter !== "ALL") {
    if (assignedUserFilter === "__UNASSIGNED__") {
      conditions.push(`p.assigned_user_id IS NULL`);
    } else {
      conditions.push(`p.assigned_user_id = $${idx}`);
      values.push(assignedUserFilter);
      idx++;
    }
  }

  // 6. Filtro LOGÍSTICA (Transporte)
  if (filters.needsTransport === true || filters.needsTransport === 'true') {
      conditions.push(`p.needs_transport = true`);
  }
  
  if (filters.transportStatus && filters.transportStatus.trim() !== "" && filters.transportStatus !== "ALL") {
      conditions.push(`p.transport_status = $${idx}`);
      values.push(filters.transportStatus);
      idx++;
  }

  // 7. Filtro por ESTADO DE VISITA (Visitado/No Visitado) - Legacy support
  if (filters.visitedStatus) {
      if (filters.visitedStatus === 'VISITED') conditions.push(`p.campaign_status IN ('VISITED', 'VISITED_PC')`);
      if (filters.visitedStatus === 'NOT_VISITED') conditions.push(`(p.campaign_status IS NULL OR p.campaign_status = 'NOT_VISITED')`);
      // No incrementamos idx porque no usamos parámetros, son literales seguros
  }

  // 8. Filtros Financieros y Pedidos
  if (filters.hasRequests === true || filters.hasRequests === 'true') {
      conditions.push(`jsonb_array_length(p.requests) > 0`);
  }

  if (filters.hasFinancialNeeds && filters.hasFinancialNeeds !== 'ALL') {
      conditions.push(`p.has_financial_needs = $${idx}`);
      values.push(filters.hasFinancialNeeds === 'true' || filters.hasFinancialNeeds === true);
      idx++;
  }

  if (filters.financialNeedsFulfilled && filters.financialNeedsFulfilled !== 'ALL') {
      conditions.push(`p.financial_needs_fulfilled = $${idx}`);
      values.push(filters.financialNeedsFulfilled === 'true' || filters.financialNeedsFulfilled === true);
      idx++;
  }

  // 9. Filtro por HA VOTADO
  if (filters.hasVoted === true || filters.hasVoted === 'true') {
      conditions.push(`p.has_voted = true`);
  } else if (filters.hasVoted === false || filters.hasVoted === 'false') {
      conditions.push(`p.has_voted = false`);
  }

  return { 
    whereClause: conditions.length > 0 ? "AND " + conditions.join(" AND ") : "", 
    values 
  };
}

type ListSortDir = "ASC" | "DESC";

function resolveListMembersOrder(sortBy?: string, sortDir: ListSortDir = "ASC") {
  if (!sortBy) {
    return "ORDER BY p.updated_at DESC";
  }

  const safeSortDir: ListSortDir = sortDir === "DESC" ? "DESC" : "ASC";
  let orderByClause = "g.last_name";

  switch (sortBy) {
    case "document_id":
      orderByClause = `CAST(NULLIF(g.document_id, '') AS BIGINT)`;
      break;
    case "first_name":
      orderByClause = "g.first_name";
      break;
    case "last_name":
      orderByClause = "g.last_name";
      break;
    case "voting_order_number":
      orderByClause = "g.voting_order_number";
      break;
    case "voting_table_number":
      orderByClause = "g.voting_table_number";
      break;
    case "address":
      orderByClause = "g.address";
      break;
    case "phone_number":
      orderByClause = "g.phone_number";
      break;
    case "whatsapp_number":
      orderByClause = "p.whatsapp_number";
      break;
    case "party_affiliation":
      orderByClause = "g.party_affiliation";
      break;
    case "party_affiliation_date":
      orderByClause = "g.party_affiliation_date";
      break;
    case "birthdate":
      orderByClause = "g.birthdate";
      break;
    case "sex":
      orderByClause = "g.sex";
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
    case "current_vote_intent":
      orderByClause = "p.current_vote_intent";
      break;
    case "has_voted":
      orderByClause = "p.has_voted";
      break;
    case "campaign_status":
      orderByClause = "p.campaign_status";
      break;
    case "is_visited":
      orderByClause = "p.is_visited";
      break;
    case "needs_transport":
      orderByClause = "p.needs_transport";
      break;
    case "transport_status":
      orderByClause = "p.transport_status";
      break;
    case "has_financial_needs":
      orderByClause = "p.has_financial_needs";
      break;
    case "financial_needs_fulfilled":
      orderByClause = "p.financial_needs_fulfilled";
      break;
    case "financial_amount":
      orderByClause = "p.financial_amount";
      break;
    case "assigned_station_id":
      orderByClause = "p.assigned_station_id";
      break;
    case "assigned_user_id":
      orderByClause = "p.assigned_user_id";
      break;
    case "status_day_d":
      orderByClause = "p.status_day_d";
      break;
    case "station_checkin_at":
      orderByClause = "p.station_checkin_at";
      break;
    default:
      orderByClause = "g.last_name";
      break;
  }

  return `ORDER BY ${orderByClause} ${safeSortDir}, p.updated_at DESC`;
}

export async function listGetMembers(
  campaignId: string,
  listId: string,
  limit: number = 50,
  offset: number = 0,
  filterOverride?: any,
  search?: string,
  sortBy?: string,
  sortDir?: ListSortDir
) {
  // 1. Primero obtenemos la definición de la lista para ver sus filtros
  const listDef = await query(
  `SELECT name, filters FROM lists WHERE id = $1 AND campaign_id = $2`,
  [listId, campaignId]
);

  if (listDef.rows.length === 0) return null; // La lista no existe

  // 2. Fusionar filtros: Override tiene prioridad sobre DB
  const dbFilters = listDef.rows[0].filters || {};
  const filters = { ...dbFilters, ...(filterOverride || {}) };
  const listName = listDef.rows[0].name;

  // 3. Construimos la query dinámica usando el Motor
  // Empezamos en $2 porque $1 será campaignId
  const { whereClause, values } = buildSmartQuery(filters, 2);
  const normalizedSearch = search?.trim();
  let searchClause = "";
  const orderByClause = resolveListMembersOrder(sortBy, sortDir);

  if (normalizedSearch) {
    const searchParamIndex = values.length + 2;
    values.push(`%${normalizedSearch}%`);
    searchClause = `
      AND (
        g.document_id ILIKE $${searchParamIndex}
        OR g.first_name ILIKE $${searchParamIndex}
        OR g.last_name ILIKE $${searchParamIndex}
        OR CONCAT(g.first_name, ' ', g.last_name) ILIKE $${searchParamIndex}
        OR CONCAT(g.last_name, ' ', g.first_name) ILIKE $${searchParamIndex}
      )
    `;
  }

  // 4. Ejecutamos la consulta final
  // NOTA: Traemos las mismas columnas que en el Padrón General para reutilizar la tabla del frontend
  const sql = `
    SELECT 
        p.id, 
        p.current_vote_intent, 
        p.has_voted, 
        p.is_visited, 
        p.campaign_status,     -- Importante para colorear
        p.needs_transport,     -- Importante para logística
        p.transport_status,
        p.has_financial_needs,
        p.financial_needs_fulfilled,
        p.financial_amount,
        p.exact_address,
        p.whatsapp_number,
        p.assigned_station_id,
        p.assigned_user_id,
        p.status_day_d,
        p.station_checkin_at,
        p.requests,
        p.notes,
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
        g.location_department,
        g.location_district,
        g.location_place,
        g.voting_table_number,
        count(*) OVER() as full_count
    FROM persons p
    JOIN global_citizens g ON p.citizen_id = g.id
    WHERE p.campaign_id = $1 AND p.deleted_at IS NULL
    ${whereClause}
    ${searchClause}
    ${orderByClause}
    LIMIT $${values.length + 2} OFFSET $${values.length + 3}
  `;

  // Armamos el array final de parámetros: [campaignId, ...filtros, limit, offset]
  const finalParams = [campaignId, ...values, limit, offset];

  const res = await query(sql, finalParams);
  
  return {
    listName,
    members: res.rows,
    total: res.rows.length > 0 ? parseInt(res.rows[0].full_count) : 0,
    filtersApplied: filters // Devolvemos los filtros para que el frontend sepa qué se aplicó (fusión)
  };

}
