import { Pool } from "pg";
import { pool } from "./pool";
import { QueryResult, QueryResultRow } from "pg";
import { getLogger } from "../common/logger";

// ⚠️ ESTA LÍNEA ES CRÍTICA:
export { pool }; 

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  if (duration > 1000) {
    const log = getLogger();
    log.warn({ text, duration, rows: res.rowCount }, "Slow query");
  }
  
  return res;
};
