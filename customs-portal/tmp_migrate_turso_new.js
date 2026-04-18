const { createClient } = require('@libsql/client');
const url = 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw';

const db = createClient({ url, authToken: token });

async function migrate() {
  try {
    console.log('Checking tables...');
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Existing tables:', tables.rows.map(r => r.name));

    console.log('Creating batches table...');
    await db.execute(`CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'open',
      released_at TIMESTAMP
    )`);
    
    console.log('Ensuring batch_requests exists and has batch_id...');
    await db.execute(`CREATE TABLE IF NOT EXISTS batch_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT,
        username TEXT,
        vrfs_id TEXT,
        type TEXT,
        details TEXT,
        proof_url TEXT,
        status TEXT DEFAULT 'pending',
        staff_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    try {
      await db.execute('ALTER TABLE batch_requests ADD COLUMN batch_id INTEGER');
    } catch (e) {
      console.log('batch_id column might already exist:', e.message);
    }
    
    console.log('Migration complete.');
  } catch (err) {
    console.error(err);
  }
}

migrate();
