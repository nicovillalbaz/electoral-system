import { query } from "../../db/query";

export async function tasksList(
  campaignId: string,
  params: {
    q?: string;
    priority?: string; // 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    taskType?: string; // 'VISIT', 'CALL', 'EVENT', 'LOGISTICS'
    assignedUserId?: string;
    relatedPersonId?: string;
    startDate?: string;
    endDate?: string;
    status?: "PENDING" | "COMPLETED" | "ALL";
    page?: number;
    limit?: number;
  }
) {
  const {
    q = "",
    page = 1,
    limit = 50,
    status = "ALL"
  } = params;
  const offset = (page - 1) * limit;

  const conditions = [`t.campaign_id = $1`];
  const queryParams: any[] = [campaignId];
  let paramIndex = 2;

  // Search
  if (q) {
    conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
    queryParams.push(`%${q}%`);
    paramIndex++;
  }

  // Filters
  if (params.priority) {
    conditions.push(`t.priority = $${paramIndex}`);
    queryParams.push(params.priority);
    paramIndex++;
  }
  
  if (params.taskType) {
    conditions.push(`t.task_type = $${paramIndex}`);
    queryParams.push(params.taskType);
    paramIndex++;
  }
  
  if (params.assignedUserId) {
    conditions.push(`t.assigned_user_id = $${paramIndex}`);
    queryParams.push(params.assignedUserId);
    paramIndex++;
  }

  if (params.relatedPersonId) {
    conditions.push(`t.related_person_id = $${paramIndex}`);
    queryParams.push(params.relatedPersonId);
    paramIndex++;
  }

  if (status === "PENDING") {
    conditions.push(`t.completed_at IS NULL`);
  } else if (status === "COMPLETED") {
    conditions.push(`t.completed_at IS NOT NULL`);
  }

  // Date range (due_date)
  if (params.startDate) {
    conditions.push(`t.due_date >= $${paramIndex}`);
    queryParams.push(params.startDate);
    paramIndex++;
  }
  
  if (params.endDate) {
    conditions.push(`t.due_date <= $${paramIndex}`);
    queryParams.push(params.endDate);
    paramIndex++;
  }

  const sql = `
    SELECT 
      t.*,
      u_assigned.full_name as assigned_user_name,
      u_creator.full_name as created_by_name,
      p.first_name as person_first_name,
      p_global.last_name as person_last_name,
      l.name as list_name,
      count(*) OVER() as full_count
    FROM tasks t
    LEFT JOIN users u_assigned ON t.assigned_user_id = u_assigned.id
    LEFT JOIN users u_creator ON t.created_by = u_creator.id
    LEFT JOIN persons p ON t.related_person_id = p.id
    LEFT JOIN global_citizens p_global ON p.citizen_id = p_global.id
    LEFT JOIN lists l ON t.related_list_id = l.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryParams.push(limit, offset);

  const res = await query(sql, queryParams);

  return {
    data: res.rows,
    total: res.rows.length > 0 ? Number(res.rows[0].full_count) : 0,
  };
}

export async function taskCreate(campaignId: string, creatorUserId: string, data: any) {
  const sql = `
    INSERT INTO tasks (
      campaign_id,
      title,
      description,
      priority,
      task_type,
      due_date,
      assigned_user_id,
      created_by,
      related_person_id,
      related_list_id,
      location_text,
      location_lat,
      location_lng,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    RETURNING *
  `;

  const params = [
    campaignId,
    data.title,
    data.description || null,
    data.priority || 'MEDIUM',
    data.taskType || 'VISIT',
    data.dueDate || null,
    data.assignedUserId || null,
    creatorUserId,
    data.relatedPersonId || null,
    data.relatedListId || null,
    data.locationText || null,
    data.locationLat || null,
    data.locationLng || null
  ];

  const res = await query(sql, params);
  return res.rows[0];
}

export async function taskUpdate(campaignId: string, taskId: string, data: any) {
  // Dynamic update query
  const updates: string[] = [];
  const params: any[] = [campaignId, taskId];
  let paramIndex = 3;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(data.description);
  }
  if (data.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(data.priority);
  }
  if (data.taskType !== undefined) {
    updates.push(`task_type = $${paramIndex++}`);
    params.push(data.taskType);
  }
  if (data.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    params.push(data.dueDate);
  }
  if (data.assignedUserId !== undefined) {
    updates.push(`assigned_user_id = $${paramIndex++}`);
    params.push(data.assignedUserId);
  }
  if (data.completed !== undefined) {
    if (data.completed) {
      updates.push(`completed_at = NOW()`);
    } else {
      updates.push(`completed_at = NULL`);
    }
  }

  if (updates.length === 0) return { success: true }; // Nothing to update

  updates.push(`updated_at = NOW()`);

  const sql = `
    UPDATE tasks
    SET ${updates.join(", ")}
    WHERE campaign_id = $1 AND id = $2
    RETURNING *
  `;

  const res = await query(sql, params);
  return res.rows[0];
}

export async function taskDelete(campaignId: string, taskId: string) {
  const sql = `DELETE FROM tasks WHERE campaign_id = $1 AND id = $2 RETURNING id`;
  const res = await query(sql, [campaignId, taskId]);
  return (res.rowCount ?? 0) > 0;
}
