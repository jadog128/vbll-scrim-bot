import { createClient, type InArgs } from '@libsql/client';

const url = process.env.VCC_TURSO_URL || process.env.TURSO_URL;
const authToken = process.env.VCC_TURSO_TOKEN || process.env.TURSO_TOKEN;

const db = url ? createClient({ url, authToken }) : null;

export async function run(sql: string, args: InArgs = []) {
  if (!db) return;
  return await db.execute({ sql, args });
}

export async function get<T = any>(sql: string, args: InArgs = []): Promise<T | null> {
  if (!db) return null;
  const r = await db.execute({ sql, args });
  if (!r.rows.length) return null;
  return Object.fromEntries(r.columns.map((c, i) => [c, r.rows[0][i]])) as T;
}

export async function all<T = any>(sql: string, args: InArgs = []): Promise<T[]> {
  if (!db) return [];
  const r = await db.execute({ sql, args });
  return r.rows.map(row => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))) as T[];
}
