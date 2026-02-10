import { query } from "../../db/query";

export async function totals(campaignId: string) {
  const res = await query(
    `SELECT
       COUNT(*)::int AS total_persons,
       SUM(CASE WHEN has_voted THEN 1 ELSE 0 END)::int AS voted,
       SUM(CASE WHEN NOT has_voted THEN 1 ELSE 0 END)::int AS missing,
       SUM(CASE WHEN current_vote_intent = 'SURE' THEN 1 ELSE 0 END)::int AS sure_votes
     FROM persons
     WHERE (campaign_id=$1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))`,
    [campaignId]
  );
  return res.rows[0];
}

export async function voteIntentBreakdown(campaignId: string) {
  const res = await query(
    `SELECT current_vote_intent as label, COUNT(*)::int AS value
     FROM persons
     WHERE (campaign_id=$1 OR campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
     GROUP BY current_vote_intent
     ORDER BY value DESC`,
    [campaignId]
  );
  return res.rows;
}

export async function missingByZone(campaignId: string, limit = 20) {
  // JOIN Complejo para llegar a la ZONA desde el Ciudadano Global
  const res = await query(
    `SELECT 
       COALESCE(z.name, 'Sin Zona') as label, 
       COUNT(*)::int AS value
     FROM persons p
     JOIN global_citizens g ON p.citizen_id = g.id
     LEFT JOIN polling_tables pt ON g.voting_table_id = pt.id
     LEFT JOIN polling_places pp ON pt.polling_place_id = pp.id
     LEFT JOIN zones z ON pp.zone_id = z.id
     WHERE (p.campaign_id=$1 OR p.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) 
       AND p.has_voted=false
     GROUP BY z.name
     ORDER BY value DESC
     LIMIT $2`,
    [campaignId, limit]
  );
  return res.rows;
}

export async function performanceByZone(campaignId: string) {
  const res = await query(
    `SELECT 
       COALESCE(z.name, 'General') as label,
       COUNT(*)::int as total,
       SUM(CASE WHEN p.has_voted THEN 1 ELSE 0 END)::int as voted
     FROM persons p
     JOIN global_citizens g ON p.citizen_id = g.id
     LEFT JOIN polling_tables pt ON g.voting_table_id = pt.id
     LEFT JOIN polling_places pp ON pt.polling_place_id = pp.id
     LEFT JOIN zones z ON pp.zone_id = z.id
     WHERE (p.campaign_id=$1 OR p.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1))
     GROUP BY z.name
     ORDER BY total DESC`,
    [campaignId]
  );
  return res.rows.map((r: any) => ({
    label: r.label,
    total: r.total,
    voted: r.voted,
    percentage: r.total > 0 ? Math.round((r.voted / r.total) * 100) : 0
  }));
}

export async function stationActivity(campaignId: string, hours = 24, limit = 20) {
  const res = await query(
    `SELECT s.name as station_name, COUNT(*)::int AS checkins
     FROM station_checkins sc
     JOIN stations s ON sc.station_id = s.id
     WHERE (sc.campaign_id=$1 OR sc.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $1)) 
       AND sc.checkin_at >= now() - ($2 || ' hours')::interval
     GROUP BY s.name
     ORDER BY checkins DESC
     LIMIT $3`,
    [campaignId, hours, limit]
  );
  return res.rows;
}