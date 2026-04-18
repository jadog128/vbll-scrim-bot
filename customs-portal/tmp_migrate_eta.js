require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function migrate() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  try { await db.execute('ALTER TABLE batch_requests ADD COLUMN verified_at TIMESTAMP'); } catch(e) { console.log('verified_at likely exists'); }
  try { await db.execute('ALTER TABLE batches ADD COLUMN sent_at TIMESTAMP'); } catch(e) { console.log('sent_at likely exists'); }
  
  console.log('✅ Migration Check Complete.');
}
migrate();
