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
  campaignId: string;
  userId: string;
  message: string;
  type: "ACTIVITY_ASSIGNED" | "VOTER_ASSIGNED" | "OTHER";
  link?: string;
}) {
  const sql = `
    INSERT INTO notifications (campaign_id, user_id, message, type, link, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, false, NOW())
    RETURNING *
  `;
  const res = await query(sql, [data.campaignId, data.userId, data.message, data.type, data.link]);
  return res.rows[0];
}

export async function getUnreadNotifications(campaignId: string, userId: string) {
  const sql = `
    SELECT * FROM notifications 
    WHERE campaign_id = $1 AND user_id = $2 AND is_read = false
    ORDER BY created_at DESC
  `;
  const res = await query(sql, [campaignId, userId]);
  return res.rows;
}

export async function markNotificationAsRead(campaignId: string, userId: string, notificationId: string) {
  const sql = `
    UPDATE notifications 
    SET is_read = true 
    WHERE id = $1 AND campaign_id = $2 AND user_id = $3
    RETURNING *
  `;
  const res = await query(sql, [notificationId, campaignId, userId]);
  return res.rows[0];
}

export async function markAllNotificationsAsRead(campaignId: string, userId: string) {
    const sql = `
      UPDATE notifications 
      SET is_read = true 
      WHERE campaign_id = $1 AND user_id = $2
      RETURNING *
    `;
    const res = await query(sql, [campaignId, userId]);
    return res.rows;
  }
