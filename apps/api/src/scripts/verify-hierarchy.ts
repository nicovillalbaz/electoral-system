import "dotenv/config";
import { Pool } from "pg";

type CampaignRow = {
  id: string;
  name: string;
};

type CountRow = {
  total: number;
};

type ChildBreakdownRow = {
  id: string;
  name: string;
  person_rows: number;
  distinct_citizens: number;
  voted: number;
};

type ParentOwnRow = {
  person_rows: number;
  distinct_citizens: number;
};

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const PARENT_CAMPAIGN_NAME =
  process.env.ALTOS_PARENT_CAMPAIGN_NAME ?? "Intendente Altos";
const EXPECTED_CHILDREN = Number(process.env.ALTOS_EXPECTED_CHILDREN ?? "12");
const EXPECTED_CITIZENS = process.env.ALTOS_EXPECTED_CITIZENS
  ? Number(process.env.ALTOS_EXPECTED_CITIZENS)
  : undefined;
const STRICT_EXPECTED_COUNTS =
  (process.env.ALTOS_VERIFY_STRICT ?? "false").toLowerCase() === "true";

if (!Number.isInteger(EXPECTED_CHILDREN) || EXPECTED_CHILDREN < 0) {
  throw new Error("ALTOS_EXPECTED_CHILDREN must be a non-negative integer");
}
if (
  EXPECTED_CITIZENS !== undefined &&
  (!Number.isInteger(EXPECTED_CITIZENS) || EXPECTED_CITIZENS < 0)
) {
  throw new Error("ALTOS_EXPECTED_CITIZENS must be a non-negative integer");
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Running hierarchy verification...");
    console.log(`- Parent campaign name: ${PARENT_CAMPAIGN_NAME}`);
    console.log(`- Expected children: ${EXPECTED_CHILDREN}`);
    if (EXPECTED_CITIZENS !== undefined) {
      console.log(`- Expected citizens (distinct): ${EXPECTED_CITIZENS}`);
    }
    console.log(`- Strict expected counts: ${STRICT_EXPECTED_COUNTS}`);

    const parentRes = await client.query<CampaignRow>(
      `SELECT id, name
       FROM campaigns
       WHERE name = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [PARENT_CAMPAIGN_NAME],
    );

    if ((parentRes.rowCount ?? 0) === 0) {
      throw new Error(`Parent campaign "${PARENT_CAMPAIGN_NAME}" was not found`);
    }

    const parent = parentRes.rows[0];

    const childrenRes = await client.query<CampaignRow>(
      `SELECT id, name
       FROM campaigns
       WHERE parent_campaign_id = $1
       ORDER BY name ASC`,
      [parent.id],
    );
    const children = childrenRes.rows;

    const scopeIds = [parent.id, ...children.map((c) => c.id)];

    const parentVisibleRes = await client.query<CountRow>(
      `SELECT COUNT(DISTINCT citizen_id)::int AS total
       FROM persons
       WHERE deleted_at IS NULL
         AND (
           campaign_id = $1
           OR campaign_id IN (
             SELECT id FROM campaigns WHERE parent_campaign_id = $1
           )
         )`,
      [parent.id],
    );
    const parentVisibleDistinct = Number(parentVisibleRes.rows[0]?.total ?? 0);

    const scopedDistinctRes = await client.query<CountRow>(
      `SELECT COUNT(DISTINCT citizen_id)::int AS total
       FROM persons
       WHERE deleted_at IS NULL
         AND campaign_id = ANY($1::uuid[])`,
      [scopeIds],
    );
    const scopedDistinct = Number(scopedDistinctRes.rows[0]?.total ?? 0);

    const childBreakdownRes = await client.query<ChildBreakdownRow>(
      `SELECT
         c.id,
         c.name,
         COUNT(p.id)::int AS person_rows,
         COUNT(DISTINCT p.citizen_id)::int AS distinct_citizens,
         COUNT(*) FILTER (WHERE p.has_voted = true)::int AS voted
       FROM campaigns c
       LEFT JOIN persons p
         ON p.campaign_id = c.id
        AND p.deleted_at IS NULL
       WHERE c.parent_campaign_id = $1
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`,
      [parent.id],
    );
    const childBreakdown = childBreakdownRes.rows;

    const parentOwnRes = await client.query<ParentOwnRow>(
      `SELECT
         COUNT(*)::int AS person_rows,
         COUNT(DISTINCT citizen_id)::int AS distinct_citizens
       FROM persons
       WHERE campaign_id = $1
         AND deleted_at IS NULL`,
      [parent.id],
    );
    const parentOwn = parentOwnRes.rows[0];

    const failures: string[] = [];
    const warnings: string[] = [];

    if (children.length !== EXPECTED_CHILDREN) {
      failures.push(
        `Expected ${EXPECTED_CHILDREN} child campaigns, found ${children.length}.`,
      );
    }

    if (parentVisibleDistinct !== scopedDistinct) {
      failures.push(
        `Hierarchy scope mismatch: parent query=${parentVisibleDistinct}, direct-scope query=${scopedDistinct}.`,
      );
    }

    const emptyChildren = childBreakdown.filter((row) => row.person_rows === 0);
    if (emptyChildren.length > 0) {
      failures.push(
        `Found child campaigns with zero persons: ${emptyChildren
          .map((row) => row.name)
          .join(", ")}.`,
      );
    }

    if (EXPECTED_CITIZENS !== undefined && parentVisibleDistinct !== EXPECTED_CITIZENS) {
      const msg = `Distinct citizens mismatch: expected ${EXPECTED_CITIZENS}, found ${parentVisibleDistinct}.`;
      if (STRICT_EXPECTED_COUNTS) {
        failures.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    console.log("");
    console.log("Hierarchy summary:");
    console.log(`- Parent campaign: ${parent.name} (${parent.id})`);
    console.log(`- Child campaigns: ${children.length}`);
    console.log(`- Parent direct persons: ${parentOwn.person_rows}`);
    console.log(`- Parent direct distinct citizens: ${parentOwn.distinct_citizens}`);
    console.log(`- Parent-visible distinct citizens: ${parentVisibleDistinct}`);
    console.log(`- Direct scope distinct citizens: ${scopedDistinct}`);
    console.log("");
    console.log("Child campaign breakdown:");
    console.table(
      childBreakdown.map((row) => ({
        name: row.name,
        persons: row.person_rows,
        distinctCitizens: row.distinct_citizens,
        voted: row.voted,
      })),
    );

    if (warnings.length > 0) {
      console.log("Warnings:");
      for (const warning of warnings) {
        console.log(`- ${warning}`);
      }
    }

    if (failures.length > 0) {
      console.error("");
      console.error("Hierarchy verification FAILED:");
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("Hierarchy verification PASSED.");
  } catch (error) {
    console.error("Hierarchy verification failed with an exception:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
