import { createClient, type InArgs } from '@libsql/client';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    const url = process.env.TURSO_URL || 'libsql://vrdl-scrim-mikefeufh.aws-eu-west-1.turso.io';
    const authToken = process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1MjI1NjcsImlkIjoiMDE5Y2VlMmUtYTMwMS03OWQ0LTllZWQtYzk2NjllNDM3ZGI4IiwicmlkIjoiYmZkZWNiNDgtMDNiNi00ZTZhLWIyNTgtNWI4ZDNlNjY1Y2E3In0.FIhX1WUz8wiLlUblUOJKVk4typVm6tZBHA8vrUZzNiWOdB5nS_U4NBM-axrT0zlVe4uZbuOkHv82IP7pmgeIBQ';

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
