import { createClient, type InArgs } from '@libsql/client';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    const url = process.env.SCRIM_TURSO_URL || 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io';
    const authToken = process.env.SCRIM_TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU0ODk0MjQsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.ciGvUbBN0KRs5JefCtTvfvVMCpaWfUXsk_86-Qmsx7bGdmX4ixjD7TBzB8nx2SrE6bEh-vjiKfPYM0T6MuaWAQs';

    _client = createClient({
      url,
      authToken,
    });
  }
  return _client;
}

export async function run(sql: string, args: InArgs = []) {
  return await getClient().execute({ sql, args });
}

export async function get<T = Record<string, unknown>>(sql: string, args: InArgs = []): Promise<T | null> {
  const r = await getClient().execute({ sql, args });
  if (!r.rows.length) return null;
  return Object.fromEntries(r.columns.map((c, i) => [c, r.rows[0][i]])) as T;
}

export async function all<T = Record<string, unknown>>(sql: string, args: InArgs = []): Promise<T[]> {
  const r = await getClient().execute({ sql, args });
  return r.rows.map(row =>
    Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))
  ) as T[];
}
