import { query } from "../../db/query";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  type: string;
  link?: string;
  createdAt: Date;
}

export async function createNotification(data: {
  userId: string;
  message: string;
  type: "ACTIVITY_ASSIGNED" | "VOTER_ASSIGNED" | "OTHER";
  link?: string;
}) {
  const sql = `
    INSERT INTO notifications (user_id, message, type, link, is_read, created_at)
    VALUES ($1, $2, $3, $4, false, NOW())
    RETURNING *
  `;
  const res = await query(sql, [data.userId, data.message, data.type, data.link]);
  return res.rows[0];
}

export async function getUnreadNotifications(userId: string) {
  const sql = `
    SELECT * FROM notifications 
    WHERE user_id = $1 AND is_read = false
    ORDER BY created_at DESC
  `;
  const res = await query(sql, [userId]);
  return res.rows;
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const sql = `
    UPDATE notifications 
    SET is_read = true 
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;
  const res = await query(sql, [notificationId, userId]);
  return res.rows[0];
}

export async function markAllNotificationsAsRead(userId: string) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = $1
      RETURNING *
    `;
    const res = await query(sql, [userId]);
    return res.rows;
  }
