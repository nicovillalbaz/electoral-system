import { query } from "../../db/query";

export const campaignTreeScope = (alias: string, campaignParamIndex: number) =>
  `(${alias}.campaign_id = $${campaignParamIndex} OR ${alias}.campaign_id IN (SELECT id FROM campaigns WHERE parent_campaign_id = $${campaignParamIndex}))`;

export async function resolveRootCampaignId(campaignId: string) {
  const res = await query<{ root_campaign_id: string }>(
    `WITH RECURSIVE lineage AS (
       SELECT id, parent_campaign_id
       FROM campaigns
       WHERE id = $1

       UNION ALL

       SELECT c.id, c.parent_campaign_id
       FROM campaigns c
       JOIN lineage l ON l.parent_campaign_id = c.id
     )
     SELECT id AS root_campaign_id
     FROM lineage
     WHERE parent_campaign_id IS NULL
     LIMIT 1`,
    [campaignId]
  );

  return res.rows[0]?.root_campaign_id ?? campaignId;
}
