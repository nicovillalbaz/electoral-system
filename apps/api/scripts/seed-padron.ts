import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

// 1. CONFIGURACIÓN SEGURA
// En lugar de pegarlo aquí, lo leeremos de tu archivo .env
const TARGET_CAMPAIGN_ID = process.env.SEED_CAMPAIGN_ID;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Interfaz EXACTA a tu JSON real
interface RegistroPadron {
  desc_dep: string; // CORDILLERA
  desc_dis: string; // SAN BERNARDINO
  desc_sec: string; // SAN BERNARDINO
  desc_locanr: string; // ESCUELA N 39...
  mesa?: string | number | null;
  orden?: string | number | null;
  numero_ced: string | number;
  apellido: string;
  nombre: string;
  fecha_naci?: string; // "26/6/1980"
  direccion?: string | null;
  fecha_afil?: string; // "23/12/2019"
  Afiliacion?: string | null; // "ANR"
}

// Helper para fechas
function parseFecha(fechaStr?: string): Date | null {
  if (!fechaStr) return null;

  const texto = String(fechaStr).trim();
  if (!texto) return null;

  const partes = texto.split("/");
  if (partes.length !== 3) return null;

  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const anio = parseInt(partes[2], 10);

  if (
    Number.isNaN(dia) ||
    Number.isNaN(mes) ||
    Number.isNaN(anio)
  ) {
    return null;
  }

  return new Date(anio, mes, dia);
}

function normalizePadronAddress(address?: string | null): string | null {
  if (address === undefined || address === null) return null;

  const normalized = String(address)
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalized.length > 0 ? normalized : null;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (text === "") return null;

  const n = Number(text);
  return Number.isInteger(n) ? n : null;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function main() {
  // Validación de seguridad antes de arrancar
  if (!TARGET_CAMPAIGN_ID) {
    console.error("❌ ERROR: No definiste el ID de la campaña.");
    console.error(
      "👉 Agrega esto en tu archivo .env: SEED_CAMPAIGN_ID=tu-uuid-aqui",
    );
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log(
      `🚀 Iniciando Importación para la campaña: ${TARGET_CAMPAIGN_ID}`,
    );

    const dataPath = path.join(__dirname, "../padron_data.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const registros: RegistroPadron[] = JSON.parse(rawData);

    console.log(`📄 Se encontraron ${registros.length} registros.`);

    // Cachés para optimizar velocidad
    const cityCache = new Map<string, string>();
    const zoneCache = new Map<string, string>();
    const placeCache = new Map<string, string>();
    const tableCache = new Map<string, string>();

    let count = 0;

    await client.query("BEGIN");

    for (const reg of registros) {
      count++;

      if (count % 100 === 0) {
        console.log(`⏳ Procesando ${count}/${registros.length}...`);
      }

      // ---------------------------------------------------------
      // A. NORMALIZACIÓN DE DATOS DE ENTRADA
      // ---------------------------------------------------------
      const departamento = toText(reg.desc_dep).toUpperCase();
      const ciudad = toText(reg.desc_dis).toUpperCase();
      const seccional = toText(reg.desc_sec).toUpperCase();
      const local = toText(reg.desc_locanr).toUpperCase();

      const mesaNumero = toIntOrNull(reg.mesa);
      const ordenNumero = toIntOrNull(reg.orden);

      const docId = toText(reg.numero_ced);
      const firstName = toText(reg.nombre).toUpperCase();
      const lastName = toText(reg.apellido).toUpperCase();

      const fechaNac = parseFecha(reg.fecha_naci);
      const fechaAfil = parseFecha(reg.fecha_afil);
      const normalizedAddress = normalizePadronAddress(reg.direccion);
      const partyAffiliation = toText(reg.Afiliacion) || null;

      // Saltar registros sin documento
      if (!docId) {
        console.warn(
          `⚠️ Registro omitido por no tener número de cédula válido en la posición ${count}.`,
        );
        continue;
      }

      // ---------------------------------------------------------
      // B. GESTIÓN DE TERRITORIO (Ciudades, Seccionales, Locales)
      // ---------------------------------------------------------

      // 1. Ciudad
      const cityKey = `${departamento}-${ciudad}`;
      let cityId = cityCache.get(cityKey);

      if (!cityId) {
        const res = await client.query(
          `
          WITH inserted AS (
            INSERT INTO cities (department_name, name)
            VALUES ($1, $2)
            ON CONFLICT (department_name, name) DO NOTHING
            RETURNING id
          )
          SELECT id FROM inserted
          UNION ALL
          SELECT id
          FROM cities
          WHERE department_name = $1
            AND name = $2
          LIMIT 1
          `,
          [departamento, ciudad],
        );

        cityId = res.rows[0]?.id;

        if (!cityId) {
          throw new Error(
            `No se pudo resolver city_id para departamento="${departamento}" ciudad="${ciudad}"`,
          );
        }

        cityCache.set(cityKey, cityId);
      }

      // 2. Zona (Seccional)
      const zoneKey = `${cityId}-${seccional}`;
      let zoneId = zoneCache.get(zoneKey);

      if (!zoneId) {
        const res = await client.query(
          `
          WITH inserted AS (
            INSERT INTO zones (city_id, name)
            VALUES ($1, $2)
            ON CONFLICT (city_id, name) DO NOTHING
            RETURNING id
          )
          SELECT id FROM inserted
          UNION ALL
          SELECT id
          FROM zones
          WHERE city_id = $1
            AND name = $2
          LIMIT 1
          `,
          [cityId, seccional],
        );

        zoneId = res.rows[0]?.id;

        if (!zoneId) {
          throw new Error(
            `No se pudo resolver zone_id para city_id="${cityId}" seccional="${seccional}"`,
          );
        }

        zoneCache.set(zoneKey, zoneId);
      }

      // 3. Local de votación
      const placeKey = `${zoneId}-${local}`;
      let placeId = placeCache.get(placeKey);

      if (!placeId) {
        const res = await client.query(
          `
          WITH inserted AS (
            INSERT INTO polling_places (zone_id, name)
            VALUES ($1, $2)
            ON CONFLICT (zone_id, name) DO NOTHING
            RETURNING id
          )
          SELECT id FROM inserted
          UNION ALL
          SELECT id
          FROM polling_places
          WHERE zone_id = $1
            AND name = $2
          LIMIT 1
          `,
          [zoneId, local],
        );

        placeId = res.rows[0]?.id;

        if (!placeId) {
          throw new Error(
            `No se pudo resolver polling_place_id para zone_id="${zoneId}" local="${local}"`,
          );
        }

        placeCache.set(placeKey, placeId);
      }

      // 4. Mesa
      let tableId: string | null = null;

      if (mesaNumero !== null) {
        const tableKey = `${placeId}-${mesaNumero}`;
        tableId = tableCache.get(tableKey) ?? null;

        if (!tableId) {
          const res = await client.query(
            `
            WITH inserted AS (
              INSERT INTO polling_tables (polling_place_id, number)
              VALUES ($1, $2)
              ON CONFLICT (polling_place_id, number) DO NOTHING
              RETURNING id
            )
            SELECT id FROM inserted
            UNION ALL
            SELECT id
            FROM polling_tables
            WHERE polling_place_id = $1
              AND number = $2
            LIMIT 1
            `,
            [placeId, mesaNumero],
          );

          tableId = res.rows[0]?.id ?? null;

          if (!tableId) {
            throw new Error(
              `No se pudo resolver polling_table_id para polling_place_id="${placeId}" mesa="${mesaNumero}"`,
            );
          }

          tableCache.set(tableKey, tableId);
        }
      }

      // ---------------------------------------------------------
      // C. EL CIUDADANO GLOBAL
      // ---------------------------------------------------------

      const citizenRes = await client.query(
        `
        INSERT INTO global_citizens (
          document_id,
          first_name,
          last_name,
          birthdate,
          address,
          party_affiliation,
          party_affiliation_date,
          voting_table_id,
          voting_order_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (document_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          birthdate = COALESCE(EXCLUDED.birthdate, global_citizens.birthdate),
          address = COALESCE(EXCLUDED.address, global_citizens.address),
          party_affiliation = COALESCE(EXCLUDED.party_affiliation, global_citizens.party_affiliation),
          party_affiliation_date = COALESCE(EXCLUDED.party_affiliation_date, global_citizens.party_affiliation_date),
          voting_table_id = EXCLUDED.voting_table_id,
          voting_order_number = EXCLUDED.voting_order_number,
          updated_at = NOW()
        RETURNING id
        `,
        [
          docId,
          firstName,
          lastName,
          fechaNac,
          normalizedAddress,
          partyAffiliation,
          fechaAfil,
          tableId,
          ordenNumero,
        ],
      );

      const citizenId = citizenRes.rows[0]?.id;

      if (!citizenId) {
        throw new Error(
          `No se pudo obtener citizen_id para document_id="${docId}"`,
        );
      }

      // ---------------------------------------------------------
      // D. VINCULACIÓN A TU CAMPAÑA
      // ---------------------------------------------------------
      await client.query(
        `
        INSERT INTO persons (campaign_id, citizen_id, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (campaign_id, citizen_id) DO NOTHING
        `,
        [TARGET_CAMPAIGN_ID, citizenId],
      );
    }

    await client.query("COMMIT");

    console.log("✅ ¡Importación completada con éxito!");
    console.log(
      `📊 Se procesaron ${count} ciudadanos y se vincularon a tu campaña.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error fatal:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();