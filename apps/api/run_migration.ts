import { query } from "./src/db/query";
import * as fs from "fs";
import * as path from "path";

function resolveSqlPath() {
  const configuredPath = process.env.MIGRATION_SQL_PATH;
  const candidates = [
    configuredPath,
    path.resolve(process.cwd(), "phase2_migration.sql"),
    path.resolve(process.cwd(), "../phase2_migration.sql"),
  ].filter((value): value is string => Boolean(value));

  const foundPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!foundPath) {
    throw new Error(
      "No se encontro ningun archivo SQL de migracion. Define MIGRATION_SQL_PATH o agrega phase2_migration.sql."
    );
  }

  return foundPath;
}

async function run() {
  try {
    const sqlPath = resolveSqlPath();
    console.log(`Reading SQL from ${sqlPath}...`);
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Executing SQL...");
    await query(sql);

    console.log("Migration successful!");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

run();
