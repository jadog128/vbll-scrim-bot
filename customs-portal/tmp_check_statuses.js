require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function check() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  const r = await db.execute('SELECT DISTINCT status FROM batch_requests');
  console.log('Statuses:', r.rows.map(r => r.status));
  
  const r2 = await db.execute('SELECT COUNT(*) as cnt FROM batch_requests WHERE status IS NULL');
  console.log('NULL Status Count:', r2.rows[0].cnt);
}
check();
