import { query } from "../../db/query";
import { campaignTreeScope } from "../../common/campaign/scope";

export async function createCity(_campaignId: string, name: string) {
  const res = await query(`INSERT INTO cities (name) VALUES ($1) RETURNING *`, [name]);
  return res.rows[0];
}

export async function listCities(_campaignId: string) {
  const res = await query(`SELECT * FROM cities ORDER BY name`);
  return res.rows;
}

export async function createZone(_campaignId: string, cityId: string, name: string) {
  const res = await query(
    `INSERT INTO zones (city_id, name) VALUES ($1,$2) RETURNING *`,
    [cityId, name]
  );
  return res.rows[0];
}

export async function listZones(_campaignId: string, cityId?: string) {
  const params: any[] = [];
  let where = "";
  if (cityId) {
    params.push(cityId);
    where = `WHERE z.city_id=$1`;
  }

  const res = await query(
    `SELECT z.*, c.name AS city_name, c.department_name
     FROM zones z
     JOIN cities c ON c.id = z.city_id
     ${where}
     ORDER BY z.name`,
    params
  );
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
  let where = `WHERE ${campaignTreeScope("n", 1)}`;
  if (zoneId) {
    params.push(zoneId);
    where += ` AND n.zone_id=$2`;
  }

  const res = await query(
    `SELECT n.*, z.name AS zone_name
     FROM neighborhoods n
     JOIN zones z ON z.id = n.zone_id
     ${where}
     ORDER BY n.name`,
    params
  );
  return res.rows;
}

export async function createPollingPlace(_campaignId: string, zoneId: string, name: string, address?: string | null) {
  const res = await query(
    `INSERT INTO polling_places (zone_id, name, address) VALUES ($1,$2,$3) RETURNING *`,
    [zoneId, name, address ?? null]
  );
  return res.rows[0];
}

export async function listPollingPlaces(_campaignId: string, zoneId?: string) {
  const params: any[] = [];
  let where = "";
  if (zoneId) {
    params.push(zoneId);
    where = `WHERE pp.zone_id=$1`;
  }

  const res = await query(
    `SELECT pp.*, z.name AS zone_name, c.name AS city_name
     FROM polling_places pp
     JOIN zones z ON z.id = pp.zone_id
     JOIN cities c ON c.id = z.city_id
     ${where}
     ORDER BY pp.name`,
    params
  );
  return res.rows;
}

export async function createPollingTable(_campaignId: string, pollingPlaceId: string, number: number) {
  const res = await query(
    `INSERT INTO polling_tables (polling_place_id, number) VALUES ($1,$2) RETURNING *`,
    [pollingPlaceId, number]
  );
  return res.rows[0];
}

export async function listPollingTables(_campaignId: string, pollingPlaceId?: string) {
  const params: any[] = [];
  let where = "";
  if (pollingPlaceId) {
    params.push(pollingPlaceId);
    where = `WHERE pt.polling_place_id=$1`;
  }

  const res = await query(
    `SELECT pt.*, pp.name AS polling_place_name, z.name AS zone_name
     FROM polling_tables pt
     JOIN polling_places pp ON pp.id = pt.polling_place_id
     JOIN zones z ON z.id = pp.zone_id
     ${where}
     ORDER BY pt.number`,
    params
  );
  return res.rows;
}
