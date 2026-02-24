import "dotenv/config";
import { hash } from "bcryptjs";
import { Pool, PoolClient } from "pg";

type GlobalCitizenSeed = {
  documentId: string;
  firstName: string;
  lastName: string;
  address: string;
  partyAffiliation: string;
  phoneNumber: string;
  votingTableNumber: number;
  votingOrderNumber: number;
};

type PersonSeed = {
  campaignId: string;
  citizenId: string;
  currentVoteIntent: string;
  hasVoted: boolean;
  assignedStationId: string;
  campaignStatus: string;
  statusDayD: string;
  needsTransport: boolean;
  transportStatus: string;
};

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const TOTAL_CITIZENS = Number(process.env.ALTOS_TOTAL_CITIZENS ?? "20000");
const BATCH_SIZE = Number(process.env.ALTOS_BATCH_SIZE ?? "500");
const RNG_SEED = Number(process.env.ALTOS_SEED ?? "20260223");
const DEFAULT_PASSWORD = process.env.ALTOS_DEFAULT_PASSWORD ?? "Altos2026!";
const PARENT_ADMIN_EMAIL =
  process.env.ALTOS_PARENT_ADMIN_EMAIL ?? "intendente.altos.admin@seed.local";
const CHILD_OPERATOR_EMAIL_DOMAIN =
  process.env.ALTOS_CHILD_OPERATOR_EMAIL_DOMAIN ?? "seed.local";
const DOC_BASE = process.env.ALTOS_DOC_BASE
  ? BigInt(process.env.ALTOS_DOC_BASE)
  : BigInt(Date.now()) * 100000n;

if (!Number.isInteger(TOTAL_CITIZENS) || TOTAL_CITIZENS <= 0) {
  throw new Error("ALTOS_TOTAL_CITIZENS must be a positive integer");
}
if (!Number.isInteger(BATCH_SIZE) || BATCH_SIZE <= 0 || BATCH_SIZE > 1000) {
  throw new Error("ALTOS_BATCH_SIZE must be between 1 and 1000");
}

const pool = new Pool({ connectionString: DATABASE_URL });

const FIRST_NAMES = [
  "JUAN",
  "MARIA",
  "CARLOS",
  "ANA",
  "LUIS",
  "SOFIA",
  "MIGUEL",
  "LAURA",
  "PEDRO",
  "ELENA",
  "DIEGO",
  "PATRICIA",
  "MARTIN",
  "GABRIELA",
  "NICOLAS",
  "VALERIA",
];

const LAST_NAMES = [
  "GONZALEZ",
  "ROJAS",
  "BENITEZ",
  "FERNANDEZ",
  "LOPEZ",
  "ORTIZ",
  "CABRERA",
  "MARTINEZ",
  "ALVAREZ",
  "PEREZ",
  "RAMIREZ",
  "DUARTE",
  "MENDOZA",
  "SOSA",
  "ACOSTA",
  "FRANCO",
];

const ADDRESSES = [
  "B° CENTRO",
  "B° SAN MIGUEL",
  "B° CRISTOBAL COLON",
  "B° YBYHANGUY 1",
  "B° YBYHANGUY 2",
  "B° SANTA ROSALINA",
  "B° SANTA LIBRADA",
  "B° LAS MERCEDES",
  "B° CIERVO CUA",
  "B° PUERTA DEL LAGO",
];

const PARTY_AFFILIATIONS = ["ANR", "PLRA", "INDEPENDIENTE"];
const VOTE_INTENTS = [
  "SURE",
  "PROBABLE",
  "OPPOSITION_INTERNAL",
  "OPPOSITION_PARTY",
  "WONT_VOTE",
  "UNDECIDED",
];
const CAMPAIGN_STATUSES = [
  "NOT_VISITED",
  "TO_VISIT",
  "CONTACTED",
  "VISITED",
  "VISITED_PC",
  "PENDING",
];
const DAY_D_STATUSES = ["PENDING", "SEARCHING", "ON_TRANSIT", "ARRIVED", "CHECKED_IN"];
const TRANSPORT_STATUSES = ["PENDING", "ASSIGNED", "COMPLETED"];

function childOperatorEmail(index: number): string {
  return `concejal.altos.${index}@${CHILD_OPERATOR_EMAIL_DOMAIN}`;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: T[]): T {
  const idx = Math.floor(rng() * values.length);
  return values[idx];
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

async function ensureCampaign(
  client: PoolClient,
  name: string,
  parentCampaignId: string | null,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id
     FROM campaigns
     WHERE name = $1
       AND (
         ($2::uuid IS NULL AND parent_campaign_id IS NULL)
         OR parent_campaign_id = $2
       )
     ORDER BY created_at ASC
     LIMIT 1`,
    [name, parentCampaignId],
  );

  if ((existing.rowCount ?? 0) > 0) {
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO campaigns (name, parent_campaign_id, created_at)
     VALUES ($1, $2, NOW())
     RETURNING id`,
    [name, parentCampaignId],
  );
  return inserted.rows[0].id;
}

async function ensureStation(
  client: PoolClient,
  campaignId: string,
  name: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id
     FROM stations
     WHERE campaign_id = $1
       AND name = $2
       AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`,
    [campaignId, name],
  );

  if ((existing.rowCount ?? 0) > 0) {
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO stations (campaign_id, name, status, created_at)
     VALUES ($1, $2, 'ACTIVE', NOW())
     RETURNING id`,
    [campaignId, name],
  );
  return inserted.rows[0].id;
}

async function upsertUser(
  client: PoolClient,
  input: {
    campaignId: string;
    email: string;
    fullName: string;
    role: "ADMIN" | "OPERATOR";
    operationalRole: string;
    assignedStationId: string | null;
    passwordHash: string;
  },
): Promise<string> {
  const res = await client.query<{ id: string }>(
    `INSERT INTO users (
       campaign_id,
       email,
       password_hash,
       full_name,
       role,
       operational_role,
       assigned_station_id,
       is_active,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, true, NOW())
     ON CONFLICT (campaign_id, email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       operational_role = EXCLUDED.operational_role,
       assigned_station_id = EXCLUDED.assigned_station_id,
       is_active = true,
       deleted_at = NULL
     RETURNING id`,
    [
      input.campaignId,
      input.email,
      input.passwordHash,
      input.fullName,
      input.role,
      input.operationalRole,
      input.assignedStationId,
    ],
  );

  return res.rows[0].id;
}

async function upsertGlobalCitizens(
  client: PoolClient,
  rows: GlobalCitizenSeed[],
): Promise<Map<string, string>> {
  if (rows.length === 0) return new Map();

  const params: any[] = [];
  const valuesSql = rows
    .map((row, rowIdx) => {
      const base = rowIdx * 11;
      params.push(
        row.documentId,
        row.firstName,
        row.lastName,
        row.address,
        row.partyAffiliation,
        row.phoneNumber,
        "CORDILLERA",
        "ALTOS",
        "ALTOS",
        row.votingTableNumber,
        row.votingOrderNumber,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
    })
    .join(",\n");

  const sql = `
    INSERT INTO global_citizens (
      document_id,
      first_name,
      last_name,
      address,
      party_affiliation,
      phone_number,
      location_department,
      location_district,
      location_place,
      voting_table_number,
      voting_order_number
    )
    VALUES ${valuesSql}
    ON CONFLICT (document_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      address = EXCLUDED.address,
      party_affiliation = EXCLUDED.party_affiliation,
      phone_number = EXCLUDED.phone_number,
      location_department = EXCLUDED.location_department,
      location_district = EXCLUDED.location_district,
      location_place = EXCLUDED.location_place,
      voting_table_number = EXCLUDED.voting_table_number,
      voting_order_number = EXCLUDED.voting_order_number,
      updated_at = NOW()
    RETURNING id, document_id
  `;

  const res = await client.query<{ id: string; document_id: string }>(sql, params);
  const map = new Map<string, string>();
  for (const row of res.rows) {
    map.set(row.document_id, row.id);
  }
  return map;
}

async function upsertPersons(client: PoolClient, rows: PersonSeed[]): Promise<void> {
  if (rows.length === 0) return;

  const params: any[] = [];
  const valuesSql = rows
    .map((row, rowIdx) => {
      const base = rowIdx * 9;
      params.push(
        row.campaignId,
        row.citizenId,
        row.currentVoteIntent,
        row.hasVoted,
        row.assignedStationId,
        row.campaignStatus,
        row.statusDayD,
        row.needsTransport,
        row.transportStatus,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}::day_d_status_enum, $${base + 8}, $${base + 9}, NOW())`;
    })
    .join(",\n");

  const sql = `
    INSERT INTO persons (
      campaign_id,
      citizen_id,
      current_vote_intent,
      has_voted,
      assigned_station_id,
      campaign_status,
      status_day_d,
      needs_transport,
      transport_status,
      created_at
    )
    VALUES ${valuesSql}
    ON CONFLICT (campaign_id, citizen_id)
    DO UPDATE SET
      current_vote_intent = EXCLUDED.current_vote_intent,
      has_voted = EXCLUDED.has_voted,
      assigned_station_id = EXCLUDED.assigned_station_id,
      campaign_status = EXCLUDED.campaign_status,
      status_day_d = EXCLUDED.status_day_d,
      needs_transport = EXCLUDED.needs_transport,
      transport_status = EXCLUDED.transport_status,
      updated_at = NOW()
  `;

  await client.query(sql, params);
}

async function main() {
  const startedAt = Date.now();
  const rng = mulberry32(RNG_SEED);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Seeding Altos scenario...");
    console.log(`- Total citizens: ${TOTAL_CITIZENS}`);
    console.log(`- Batch size: ${BATCH_SIZE}`);
    console.log(`- RNG seed: ${RNG_SEED}`);

    const parentCampaignId = await ensureCampaign(client, "Intendente Altos", null);

    const childCampaignIds: string[] = [];
    for (let i = 1; i <= 12; i += 1) {
      const childId = await ensureCampaign(client, `Concejal Altos ${i}`, parentCampaignId);
      childCampaignIds.push(childId);
    }

    const stationNames = [
      "Puesto de Comando Altos 1",
      "Puesto de Comando Altos 2",
      "Puesto de Comando Altos 3",
      "Puesto de Comando Altos 4",
      "Puesto de Comando Altos 5",
    ];
    const stationIds: string[] = [];
    for (const stationName of stationNames) {
      const stationId = await ensureStation(client, parentCampaignId, stationName);
      stationIds.push(stationId);
    }

    const passwordHash = await hash(DEFAULT_PASSWORD, 10);
    await upsertUser(client, {
      campaignId: parentCampaignId,
      email: PARENT_ADMIN_EMAIL,
      fullName: "Admin Intendente Altos",
      role: "ADMIN",
      operationalRole: "INTENDENTE",
      assignedStationId: stationIds[0],
      passwordHash,
    });

    for (let i = 1; i <= 12; i += 1) {
      const campaignId = childCampaignIds[i - 1];
      await upsertUser(client, {
        campaignId,
        email: childOperatorEmail(i),
        fullName: `Operador Concejal Altos ${i}`,
        role: "OPERATOR",
        operationalRole: "CONCEJAL_OPERATOR",
        assignedStationId: stationIds[(i - 1) % stationIds.length],
        passwordHash,
      });
    }

    let processed = 0;
    for (let start = 0; start < TOTAL_CITIZENS; start += BATCH_SIZE) {
      const size = Math.min(BATCH_SIZE, TOTAL_CITIZENS - start);
      const globalRows: GlobalCitizenSeed[] = [];

      for (let localIndex = 0; localIndex < size; localIndex += 1) {
        const absoluteIndex = start + localIndex;
        const docId = (DOC_BASE + BigInt(absoluteIndex)).toString();
        const firstName = pick(rng, FIRST_NAMES);
        const lastName = pick(rng, LAST_NAMES);
        const address = pick(rng, ADDRESSES);
        const partyAffiliation = pick(rng, PARTY_AFFILIATIONS);
        const phoneNumber = `09${randomInt(rng, 10000000, 99999999)}`;

        globalRows.push({
          documentId: docId,
          firstName,
          lastName,
          address,
          partyAffiliation,
          phoneNumber,
          votingTableNumber: randomInt(rng, 1, 120),
          votingOrderNumber: randomInt(rng, 1, 500),
        });
      }

      const citizenMap = await upsertGlobalCitizens(client, globalRows);

      const personRows: PersonSeed[] = globalRows.map((citizen) => {
        const hasVoted = rng() < 0.42;
        const needsTransport = rng() < 0.18;
        const assignedStationId = pick(rng, stationIds);
        const citizenId = citizenMap.get(citizen.documentId);
        if (!citizenId) {
          throw new Error(`Citizen id not returned for document ${citizen.documentId}`);
        }

        return {
          campaignId: pick(rng, childCampaignIds),
          citizenId,
          currentVoteIntent: pick(rng, VOTE_INTENTS),
          hasVoted,
          assignedStationId,
          campaignStatus: pick(rng, CAMPAIGN_STATUSES),
          statusDayD: hasVoted ? "VOTED" : pick(rng, DAY_D_STATUSES),
          needsTransport,
          transportStatus: needsTransport ? pick(rng, TRANSPORT_STATUSES) : "PENDING",
        };
      });

      await upsertPersons(client, personRows);

      processed += size;
      if (processed % (BATCH_SIZE * 5) === 0 || processed === TOTAL_CITIZENS) {
        console.log(`- Processed ${processed}/${TOTAL_CITIZENS}`);
      }
    }

    await client.query("COMMIT");

    const elapsedMs = Date.now() - startedAt;
    console.log("Altos seeding completed.");
    console.log(`- Parent campaign: ${parentCampaignId}`);
    console.log(`- Child campaigns: ${childCampaignIds.length}`);
    console.log(`- Stations: ${stationIds.length}`);
    console.log("- Users: 13 (1 admin + 12 operators)");
    console.log(`- Citizens upserted: ${TOTAL_CITIZENS}`);
    console.log(`- Persons upserted: ${TOTAL_CITIZENS}`);
    console.log(`- Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log("UI login credentials for manual scope testing:");
    console.log(`- Parent Admin  -> email: ${PARENT_ADMIN_EMAIL} | password: ${DEFAULT_PASSWORD}`);
    console.log(`- Child Operator -> email: ${childOperatorEmail(1)} | password: ${DEFAULT_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Altos seeding failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
