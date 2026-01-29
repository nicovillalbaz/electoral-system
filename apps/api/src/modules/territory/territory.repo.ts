import { query } from "../../db/query";

export async function createCity(campaignId: string, name: string) {
  const res = await query(`INSERT INTO cities (campaign_id, name) VALUES ($1,$2) RETURNING *`, [campaignId, name]);
  return res.rows[0];
}
export async function listCities(campaignId: string) {
  const res = await query(`SELECT * FROM cities WHERE campaign_id=$1 ORDER BY name`, [campaignId]);
  return res.rows;
}

export async function createZone(campaignId: string, cityId: string, name: string) {
  const res = await query(
    `INSERT INTO zones (campaign_id, city_id, name) VALUES ($1,$2,$3) RETURNING *`,
    [campaignId, cityId, name]
  );
  return res.rows[0];
}
export async function listZones(campaignId: string, cityId?: string) {
  const params: any[] = [campaignId];
  let where = `WHERE campaign_id=$1`;
  if (cityId) { params.push(cityId); where += ` AND city_id=$2`; }
  const res = await query(`SELECT * FROM zones ${where} ORDER BY name`, params);
  return res.rows;
}

export async function createNeighborhood(campaignId: string, zoneId: string, name: string) {
  const res = await query(
    `INSERT INTO neighborhoods (campaign_id, zone_id, name) VALUES ($1,$2,$3) RETURNING *`,
    [campaignId, zoneId, name]
  );
  return res.rows[0];
}
export async function listNeighborhoods(campaignId: string, zoneId?: string) {
  const params: any[] = [campaignId];
  let where = `WHERE campaign_id=$1`;
  if (zoneId) { params.push(zoneId); where += ` AND zone_id=$2`; }
  const res = await query(`SELECT * FROM neighborhoods ${where} ORDER BY name`, params);
  return res.rows;
}

export async function createPollingPlace(campaignId: string, zoneId: string, name: string, address?: string | null) {
  const res = await query(
    `INSERT INTO polling_places (campaign_id, zone_id, name, address) VALUES ($1,$2,$3,$4) RETURNING *`,
    [campaignId, zoneId, name, address ?? null]
  );
  return res.rows[0];
}
export async function listPollingPlaces(campaignId: string, zoneId?: string) {
  const params: any[] = [campaignId];
  let where = `WHERE campaign_id=$1`;
  if (zoneId) { params.push(zoneId); where += ` AND zone_id=$2`; }
  const res = await query(`SELECT * FROM polling_places ${where} ORDER BY name`, params);
  return res.rows;
}

export async function createPollingTable(campaignId: string, pollingPlaceId: string, number: number) {
  const res = await query(
    `INSERT INTO polling_tables (campaign_id, polling_place_id, number) VALUES ($1,$2,$3) RETURNING *`,
    [campaignId, pollingPlaceId, number]
  );
  return res.rows[0];
}
export async function listPollingTables(campaignId: string, pollingPlaceId?: string) {
  const params: any[] = [campaignId];
  let where = `WHERE campaign_id=$1`;
  if (pollingPlaceId) { params.push(pollingPlaceId); where += ` AND polling_place_id=$2`; }
  const res = await query(`SELECT * FROM polling_tables ${where} ORDER BY number`, params);
  return res.rows;
}
