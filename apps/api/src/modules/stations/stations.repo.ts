import { query } from "../../db/query";

export async function stationCreate(campaignId: string, data: any) {
  const res = await query(
    `INSERT INTO stations (campaign_id, name, status, city_id, zone_id, neighborhood_id, address)
     VALUES ($1,$2,'ACTIVE',$3,$4,$5,$6)
     RETURNING *`,
    [
      campaignId,
      data.name,
      data.cityId ?? null,
      data.zoneId ?? null,
      data.neighborhoodId ?? null,
      data.address ?? null,
    ]
  );
  return res.rows[0];
}

export async function stationList(campaignId: string) {
  const res = await query(
    `SELECT * FROM stations WHERE campaign_id=$1 ORDER BY name`,
    [campaignId]
  );
  return res.rows;
}
