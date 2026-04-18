import { createClient } from '@libsql/client';

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;

if (!url) {
  throw new Error('TURSO_URL is not defined in environment variables');
}

export const db = createClient({
  url,
  authToken: authToken || "",
});

export async function execute(sql: string, args: any[] = []) {
  return await db.execute({ sql, args });
}
