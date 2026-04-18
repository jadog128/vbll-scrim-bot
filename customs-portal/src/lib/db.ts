import { createClient } from '@libsql/client';

export async function execute(sql: string, args: any[] = []) {
  const url = process.env.VBLL_TURSO_URL || process.env.TURSO_URL;
  const authToken = process.env.VBLL_TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error('TURSO_URL is not defined in environment variables');
  }

  const db = createClient({
    url,
    authToken: authToken || "",
  });

  return await db.execute({ sql, args });
}
