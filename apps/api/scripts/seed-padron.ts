import 'dotenv/config'; 
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';


// 1. CONFIGURACIÓN SEGURA
// En lugar de pegarlo aquí, lo leeremos de tu archivo .env
const TARGET_CAMPAIGN_ID = process.env.SEED_CAMPAIGN_ID;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Interfaz EXACTA a tu JSON
interface RegistroPadron {
  desc_dep: string;    // CORDILLERA
  desc_dis: string;    // SAN BERNARDINO
  desc_sec: string;    // SAN BERNARDINO
  desc_locanr: string; // ESCUELA N 39...
  mesa: number;
  orden: number;
  numero_ced: number;
  apellido: string;
  nombre: string;
  fecha_naci?: string; // "26/6/1980"
  direccion?: string;
  fecha_afil?: string; // "23/12/2019"
  Afiliacion?: string; // "ANR"
}

// Helper para fechas
function parseFecha(fechaStr?: string): Date | null {
  if (!fechaStr) return null;
  const partes = fechaStr.split('/'); 
  if (partes.length !== 3) return null;
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1; 
  const anio = parseInt(partes[2], 10);
  return new Date(anio, mes, dia);
}

async function main() {
  // Validación de seguridad antes de arrancar
  if (!TARGET_CAMPAIGN_ID) {
    console.error("❌ ERROR: No definiste el ID de la campaña.");
    console.error("👉 Agrega esto en tu archivo .env: SEED_CAMPAIGN_ID=tu-uuid-aqui");
    process.exit(1);
  }

  const client = await pool.connect();
  
  try {
    console.log(`🚀 Iniciando Importación para la campaña: ${TARGET_CAMPAIGN_ID}`);
    
    const dataPath = path.join(__dirname, '../padron_data.json'); 
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const registros: RegistroPadron[] = JSON.parse(rawData);
    
    console.log(`📄 Se encontraron ${registros.length} registros.`);

    // Cachés para optimizar velocidad
    const cityCache = new Map<string, string>();
    const zoneCache = new Map<string, string>();
    const placeCache = new Map<string, string>();
    const tableCache = new Map<string, string>();

    let count = 0;
    
    await client.query('BEGIN'); // Transacción gigante

    for (const reg of registros) {
      count++;
      if (count % 100 === 0) console.log(`⏳ Procesando ${count}/${registros.length}...`);

      // ---------------------------------------------------------
      // A. GESTIÓN DE TERRITORIO (Ciudades, Seccionales, Locales)
      // ---------------------------------------------------------
      const departamento = reg.desc_dep.trim().toUpperCase();
      const ciudad = reg.desc_dis.trim().toUpperCase();
      const seccional = reg.desc_sec.trim().toUpperCase();
      const local = reg.desc_locanr.trim().toUpperCase();
      
      // 1. Ciudad
      const cityKey = `${departamento}-${ciudad}`;
      let cityId = cityCache.get(cityKey);
      if (!cityId) {
        const res = await client.query(
          `WITH inserted AS (
             INSERT INTO cities (department_name, name) VALUES ($1, $2)
             ON CONFLICT (department_name, name) DO NOTHING RETURNING id
           )
           SELECT id FROM inserted UNION ALL SELECT id FROM cities WHERE department_name=$1 AND name=$2`,
          [departamento, ciudad]
        );
        cityId = res.rows[0].id;
        cityCache.set(cityKey, cityId!);
      }

      // 2. Zona (Seccional)
      const zoneKey = `${cityId}-${seccional}`;
      let zoneId = zoneCache.get(zoneKey);
      if (!zoneId) {
        const res = await client.query(
          `WITH inserted AS (
             INSERT INTO zones (city_id, name) VALUES ($1, $2)
             ON CONFLICT (city_id, name) DO NOTHING RETURNING id
           )
           SELECT id FROM inserted UNION ALL SELECT id FROM zones WHERE city_id=$1 AND name=$2`,
          [cityId, seccional]
        );
        zoneId = res.rows[0].id;
        zoneCache.set(zoneKey, zoneId!);
      }

      // 3. Local de Votación
      const placeKey = `${zoneId}-${local}`;
      let placeId = placeCache.get(placeKey);
      if (!placeId) {
        const res = await client.query(
          `WITH inserted AS (
             INSERT INTO polling_places (zone_id, name) VALUES ($1, $2)
             ON CONFLICT (zone_id, name) DO NOTHING RETURNING id
           )
           SELECT id FROM inserted UNION ALL SELECT id FROM polling_places WHERE zone_id=$1 AND name=$2`,
          [zoneId, local]
        );
        placeId = res.rows[0].id;
        placeCache.set(placeKey, placeId!);
      }

      // 4. Mesa
      const tableKey = `${placeId}-${reg.mesa}`;
      let tableId = tableCache.get(tableKey);
      if (!tableId) {
        const res = await client.query(
          `WITH inserted AS (
             INSERT INTO polling_tables (polling_place_id, number) VALUES ($1, $2)
             ON CONFLICT (polling_place_id, number) DO NOTHING RETURNING id
           )
           SELECT id FROM inserted UNION ALL SELECT id FROM polling_tables WHERE polling_place_id=$1 AND number=$2`,
          [placeId, reg.mesa]
        );
        tableId = res.rows[0].id;
        tableCache.set(tableKey, tableId!);
      }

      // ---------------------------------------------------------
      // B. EL CIUDADANO GLOBAL
      // ---------------------------------------------------------
      
      const docId = reg.numero_ced.toString().trim(); 
      const fechaNac = parseFecha(reg.fecha_naci);
      const fechaAfil = parseFecha(reg.fecha_afil);

      // Insertamos y capturamos el ID (RETURNING id)
      const citizenRes = await client.query(
        `INSERT INTO global_citizens (
           document_id, first_name, last_name, birthdate, address,
           party_affiliation, party_affiliation_date,
           voting_table_id, voting_order_number
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (document_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           voting_table_id = EXCLUDED.voting_table_id,
           party_affiliation = EXCLUDED.party_affiliation,
           updated_at = now()
         RETURNING id`, // <--- IMPORTANTE: Necesitamos el ID para el siguiente paso
        [
          docId,
          reg.nombre.trim().toUpperCase(),
          reg.apellido.trim().toUpperCase(),
          fechaNac,
          reg.direccion?.trim(),
          reg.Afiliacion || 'ANR',
          fechaAfil,
          tableId,
          reg.orden
        ]
      );
      
      const citizenId = citizenRes.rows[0].id;

      // ---------------------------------------------------------
      // C. VINCULACIÓN A TU CAMPAÑA (¡LO QUE FALTABA!)
      // ---------------------------------------------------------
      // Sin esto, la persona existe en el país, pero NO en tu campaña.
      
      await client.query(
        `INSERT INTO persons (campaign_id, citizen_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (campaign_id, citizen_id) DO NOTHING`,
        [TARGET_CAMPAIGN_ID, citizenId]
      );
    }

    await client.query('COMMIT');
    console.log("✅ ¡Importación completada con éxito!");
    console.log(`📊 Se procesaron ${count} ciudadanos y se vincularon a tu campaña.`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error fatal:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
