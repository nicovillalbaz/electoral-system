import { Pool } from "pg";
import { pool } from "./pool";
import { QueryResult, QueryResultRow } from "pg"; // <--- Importante importar QueryResultRow

// Agregamos "extends QueryResultRow" al genérico T
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  // Opcional: Log de queries lentas
  if (duration > 1000) {
    console.log("Slow query", { text, duration, rows: res.rowCount });
  }
  
  return res;
};