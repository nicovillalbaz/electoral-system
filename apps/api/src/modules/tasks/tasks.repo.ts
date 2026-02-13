import { query, pool } from "../../db/query";
import { badRequest } from "../../common/http/errors";

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

  const conditions = [`(t.campaign_id = $1 OR t.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))`];
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
      g.first_name as person_first_name,
      g.last_name as person_last_name,
      l.name as list_name,
      count(*) OVER() as full_count
    FROM tasks t
    LEFT JOIN users u_assigned ON t.assigned_user_id = u_assigned.id
    LEFT JOIN users u_creator ON t.created_by = u_creator.id
    LEFT JOIN persons p ON t.related_person_id = p.id
    LEFT JOIN global_citizens g ON p.citizen_id = g.id
    LEFT JOIN lists l ON t.related_list_id = l.id
    WHERE ${conditions.join(" AND ")}
    AND t.deleted_at IS NULL
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

  if (data.completed === false) {
    const guardRes = await query(
      `SELECT task_type, completed_at
       FROM tasks
       WHERE (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) AND id = $2
       LIMIT 1`,
      [campaignId, taskId]
    );
    const guard = guardRes.rows[0];
    if (!guard) return null;
    if (guard.task_type === "FINANCIAL" && guard.completed_at) {
      throw badRequest("No se puede desmarcar una actividad financiera ya completada.");
    }
  }

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
    WHERE (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) AND id = $2
    RETURNING *
  `;

  const res = await query(sql, params);
  const task = res.rows[0];

  if (task && data.completed !== undefined && task.task_type === "FINANCIAL" && task.related_person_id) {
    await syncFinancialStatusFromTask({ query }, campaignId, task.id, task.related_person_id, data.completed);
  }

  return task;
}

export async function taskDelete(campaignId: string, taskId: string) {
  // SOFT DELETE: Mark as deleted instead of removing
  const sql = `UPDATE tasks SET deleted_at = NOW() WHERE (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) AND id = $2 RETURNING id`;
  const res = await query(sql, [campaignId, taskId]);
  return (res.rowCount ?? 0) > 0;
}

export async function taskCompleteWithExpense(
  campaignId: string,
  taskId: string,
  data: { amount: number; concept: string; userId: string }
) {
  const client = await pool.connect(); // Need pool import if not present, checking imports
  try {
    await client.query("BEGIN");

    // 1. Mark task as COMPLETED
    const completeSql = `
      UPDATE tasks 
      SET completed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND (campaign_id = $2 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $2))
      RETURNING id, task_type, related_person_id
    `;
    const taskRes = await client.query(completeSql, [taskId, campaignId]);
    
    if (taskRes.rowCount === 0) {
      throw new Error("Task not found or access denied");
    }
    const task = taskRes.rows[0];

    // 2. Insert Expense
    const expenseSql = `
      INSERT INTO task_expenses (task_id, amount, concept, created_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `;
    await client.query(expenseSql, [taskId, data.amount, data.concept, data.userId]);

    if (task.task_type === "FINANCIAL" && task.related_person_id) {
      await syncFinancialStatusFromTask(client, campaignId, task.id, task.related_person_id, true, data.amount);
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

async function syncFinancialStatusFromTask(
  q: { query: (sql: string, params?: any[]) => Promise<any> },
  campaignId: string,
  taskId: string,
  personId: string,
  completed: boolean,
  amount?: number
) {
  if (completed) {
    const params: any[] = [campaignId, personId];
    let sql = `
      UPDATE persons
      SET has_financial_needs = true,
          financial_needs_fulfilled = true
    `;
    if (amount !== undefined) {
      sql += `,
          financial_amount = $3
    `;
      params.push(amount);
    }
    sql += `,
          updated_at = NOW()
      WHERE id = $2
        AND (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
    `;
    await q.query(sql, params);
    return;
  }

  const checkSql = `
    SELECT 1
    FROM tasks
    WHERE related_person_id = $1
      AND task_type = 'FINANCIAL'
      AND completed_at IS NOT NULL
      AND deleted_at IS NULL
      AND id <> $2
      AND (campaign_id = $3 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $3))
    LIMIT 1
  `;
  const checkRes = await q.query(checkSql, [personId, taskId, campaignId]);
  if (checkRes.rows.length === 0) {
    await q.query(
      `
        UPDATE persons
        SET financial_needs_fulfilled = false,
            updated_at = NOW()
        WHERE id = $2
          AND (campaign_id = $1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
      `,
      [campaignId, personId]
    );
  }
}
