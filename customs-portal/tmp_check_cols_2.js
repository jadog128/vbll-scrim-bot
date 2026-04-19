require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function check() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  const r = await db.execute('PRAGMA table_info(batch_requests)');
  console.log('Columns:', r.rows.map(r => r.name));
}
check();
