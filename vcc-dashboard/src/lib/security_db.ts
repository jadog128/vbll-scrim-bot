import { createClient } from "@libsql/client";

const url = process.env.VCC_MOD_TURSO_URL || "";
const authToken = process.env.VCC_MOD_TURSO_TOKEN || "";

// Defensive client creation for build time
export const modDb = (url && authToken) 
  ? createClient({ url, authToken })
  : null;

export async function runMod(sql: string, params: any[] = []) {
  if (!modDb) return null;
  return await modDb.execute({ sql, args: params });
}

export async function getMod(sql: string, params: any[] = []) {
  if (!modDb) return null;
  const res = await modDb.execute({ sql, args: params });
  if (!res.rows.length) return null;
  const row = res.rows[0];
  const obj: any = {};
  res.columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

export async function allMod(sql: string, params: any[] = []) {
  if (!modDb) return [];
  const res = await modDb.execute({ sql, args: params });
  return res.rows.map(row => {
    const obj: any = {};
    res.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}
