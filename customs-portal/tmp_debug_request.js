require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function check() {
  const db = createClient({ 
    url: process.env.TURSO_URL || process.env.SCRIM_TURSO_URL, 
    authToken: process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN 
  });
  const res = await db.execute('SELECT * FROM batch_requests WHERE id = 353');
  console.log(JSON.stringify(res.rows[0], null, 2));
}
check();
